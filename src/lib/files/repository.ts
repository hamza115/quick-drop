import "server-only";
import { ObjectId, type Collection, type Filter, type Sort, type WithId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { CloudinaryAsset, CloudinaryDeliveryType } from "@/lib/cloudinary/server";
import {
  TYPE_FILTER_KINDS,
  type TypeFilter,
  type FileCompression,
  type FileItem,
  type FileKind,
  type SortOption,
} from "@/lib/files/constants";
import { deriveNoteTitle, escapeRegExp, hostnameOf } from "@/lib/files/format";
import { limitBytesFromMb, storageStatus, type StorageStatus } from "@/lib/files/quota";
import { getEnv } from "@/lib/env";
import type { CloudinaryResourceType } from "@/lib/uploads/policy";
import type { CreateLinkInput, CreateNoteInput, ListQuery, UpdateItemInput } from "@/lib/files/validation";

/*
 * Every function here takes the owner id and scopes its query to it.
 * Callers must pass the id from the verified session, never from the request.
 */

const COLLECTION = "files";
const NAME_COLLATION = { locale: "en", strength: 2 } as const;

export interface FileDocument {
  _id: ObjectId;
  ownerId: string;
  kind: FileKind;
  displayName: string;
  originalName: string | null;
  mimeType: string | null;
  originalSizeBytes: number;
  storedSizeBytes: number | null;
  linkUrl: string | null;
  note: string | null;
  tags: string[];
  isFavorite: boolean;
  cloudinaryAssetId: string | null;
  cloudinaryPublicId: string | null;
  resourceType: string | null;
  /** Cloudinary's own URL. Internal only: private files can't be opened with it. */
  secureUrl: string | null;
  /** Legacy (public files saved before private delivery). New records store null. */
  thumbnailUrl: string | null;
  /** Missing on records saved before private delivery; those are public ("upload"). */
  deliveryType?: CloudinaryDeliveryType;
  /** Missing on records saved before compression existed. */
  compression?: FileCompression | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryPage {
  items: FileItem[];
  total: number;
  page: number;
  pageCount: number;
}

let indexesReady: Promise<void> | undefined;

async function files(): Promise<Collection<FileDocument>> {
  const collection = getDb().collection<FileDocument>(COLLECTION);
  indexesReady ??= collection
    .createIndexes([
      { key: { ownerId: 1, createdAt: -1 }, name: "owner_createdAt" },
      { key: { ownerId: 1, kind: 1, createdAt: -1 }, name: "owner_kind_createdAt" },
      { key: { ownerId: 1, isFavorite: 1, createdAt: -1 }, name: "owner_favorite_createdAt" },
      { key: { ownerId: 1, cloudinaryPublicId: 1 }, name: "owner_cloudinaryPublicId" },
    ])
    .then(() => undefined)
    .catch((error: unknown) => {
      // Allow a retry on the next request instead of caching the failure.
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

export function isObjectIdString(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}

/**
 * Browser-facing URLs for an uploaded file. They point at QuickDrop routes that check the session
 * and owner, then redirect to a freshly signed Cloudinary URL.
 */
function appUrlsFor(doc: WithId<FileDocument>): { secureUrl: string | null; thumbnailUrl: string | null } {
  if (!doc.cloudinaryPublicId) return { secureUrl: null, thumbnailUrl: null };
  const base = `/api/files/${doc._id.toHexString()}`;
  const hasThumbnail = doc.resourceType === "image" || doc.resourceType === "video";
  return { secureUrl: `${base}/content`, thumbnailUrl: hasThumbnail ? `${base}/thumbnail` : null };
}

function toFileItem(doc: WithId<FileDocument>): FileItem {
  const urls = appUrlsFor(doc);
  return {
    id: doc._id.toHexString(),
    kind: doc.kind,
    displayName: doc.displayName,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    originalSizeBytes: doc.originalSizeBytes,
    storedSizeBytes: doc.storedSizeBytes,
    linkUrl: doc.linkUrl,
    note: doc.note,
    tags: doc.tags,
    isFavorite: doc.isFavorite,
    secureUrl: urls.secureUrl,
    thumbnailUrl: urls.thumbnailUrl,
    resourceType: doc.resourceType ?? null,
    compression: doc.compression ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function buildFilter(ownerId: string, query: Pick<ListQuery, "type" | "favorites" | "q">): Filter<FileDocument> {
  const filter: Filter<FileDocument> = { ownerId };
  if (query.type !== "all") {
    filter.kind = { $in: TYPE_FILTER_KINDS[query.type] };
  }
  if (query.favorites) {
    filter.isFavorite = true;
  }
  if (query.q) {
    const pattern = new RegExp(escapeRegExp(query.q), "i");
    filter.$or = [{ displayName: pattern }, { originalName: pattern }, { note: pattern }];
  }
  return filter;
}

function sortFor(sort: SortOption): { sort: Sort; collation?: typeof NAME_COLLATION } {
  switch (sort) {
    case "oldest":
      return { sort: { createdAt: 1, _id: 1 } };
    case "name":
      return { sort: { displayName: 1, _id: 1 }, collation: NAME_COLLATION };
    case "largest":
      return { sort: { originalSizeBytes: -1, _id: -1 } };
    default:
      return { sort: { createdAt: -1, _id: -1 } };
  }
}

export async function listFiles(ownerId: string, query: ListQuery): Promise<LibraryPage> {
  const collection = await files();
  const filter = buildFilter(ownerId, query);
  const { sort, collation } = sortFor(query.sort);

  const [docs, total] = await Promise.all([
    collection
      .find(filter, {
        sort,
        ...(collation ? { collation } : {}),
        skip: (query.page - 1) * query.pageSize,
        limit: query.pageSize,
      })
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    items: docs.map(toFileItem),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getLibrarySummary(ownerId: string): Promise<{ count: number; bytes: number }> {
  const collection = await files();
  const [summary] = await collection
    .aggregate<{ count: number; bytes: number }>([
      { $match: { ownerId } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          bytes: { $sum: { $ifNull: ["$storedSizeBytes", "$originalSizeBytes"] } },
        },
      },
      { $project: { _id: 0, count: 1, bytes: 1 } },
    ])
    .toArray();
  return summary ?? { count: 0, bytes: 0 };
}

export interface LibraryStats {
  count: number;
  favorites: number;
  /** Items saved in the last 24 hours, and the bytes they stored. */
  addedLast24h: number;
  bytesLast24h: number;
  /** Bytes saved by in-browser compression, and how many files were compressed. */
  savedBytes: number;
  compressedCount: number;
  /** Item counts for each library filter chip. */
  countsByFilter: Record<TypeFilter, number>;
  /** Stored bytes by group, for the storage composition bar. Links and notes use no file storage. */
  composition: { documents: number; media: number; other: number };
}

/** Counts and byte totals for the library overview. Scoped to the owner like every query here. */
export async function getLibraryStats(ownerId: string, now = new Date()): Promise<LibraryStats> {
  const collection = await files();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const stored = { $ifNull: ["$storedSizeBytes", "$originalSizeBytes"] };
  const isCompressed = { $ne: [{ $ifNull: ["$compression", null] }, null] };

  const [result] = await collection
    .aggregate<{
      totals: Array<{ count: number; favorites: number; savedBytes: number; compressedCount: number }>;
      recent: Array<{ count: number; bytes: number }>;
      byKind: Array<{ _id: FileKind; count: number; bytes: number }>;
    }>([
      { $match: { ownerId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                favorites: { $sum: { $cond: ["$isFavorite", 1, 0] } },
                savedBytes: {
                  $sum: { $cond: [isCompressed, { $max: [0, { $subtract: ["$originalSizeBytes", stored] }] }, 0] },
                },
                compressedCount: { $sum: { $cond: [isCompressed, 1, 0] } },
              },
            },
          ],
          recent: [
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: stored } } },
          ],
          byKind: [{ $group: { _id: "$kind", count: { $sum: 1 }, bytes: { $sum: stored } } }],
        },
      },
    ])
    .toArray();

  const totals = result?.totals[0];
  const recent = result?.recent[0];
  const kinds = new Map((result?.byKind ?? []).map((row) => [row._id, row]));
  const countOf = (...list: FileKind[]) => list.reduce((sum, kind) => sum + (kinds.get(kind)?.count ?? 0), 0);
  const bytesOf = (...list: FileKind[]) => list.reduce((sum, kind) => sum + (kinds.get(kind)?.bytes ?? 0), 0);

  return {
    count: totals?.count ?? 0,
    favorites: totals?.favorites ?? 0,
    addedLast24h: recent?.count ?? 0,
    bytesLast24h: recent?.bytes ?? 0,
    savedBytes: totals?.savedBytes ?? 0,
    compressedCount: totals?.compressedCount ?? 0,
    countsByFilter: {
      all: totals?.count ?? 0,
      image: countOf(...TYPE_FILTER_KINDS.image),
      video: countOf(...TYPE_FILTER_KINDS.video),
      document: countOf(...TYPE_FILTER_KINDS.document),
      links: countOf(...TYPE_FILTER_KINDS.links),
    },
    composition: {
      documents: bytesOf("document"),
      media: bytesOf("image", "video"),
      other: bytesOf("archive", "other"),
    },
  };
}

/** Storage usage with the configured limit, if any. */
export async function getStorageStatus(ownerId: string): Promise<StorageStatus> {
  const { count, bytes } = await getLibrarySummary(ownerId);
  return storageStatus(count, bytes, limitBytesFromMb(getEnv().STORAGE_LIMIT_MB));
}

/** Server-side fields needed to download or delete an item's stored file. Never sent to the browser. */
export interface FileAssetRef {
  kind: FileKind;
  displayName: string;
  originalName: string | null;
  cloudinaryPublicId: string | null;
  resourceType: CloudinaryResourceType | null;
  deliveryType: CloudinaryDeliveryType;
}

export async function getFileAssetRef(ownerId: string, id: string): Promise<FileAssetRef | null> {
  if (!isObjectIdString(id)) return null;
  const collection = await files();
  const doc = await collection.findOne(
    { _id: new ObjectId(id), ownerId },
    { projection: { kind: 1, displayName: 1, originalName: 1, cloudinaryPublicId: 1, resourceType: 1, deliveryType: 1 } },
  );
  if (!doc) return null;
  const resourceType =
    doc.resourceType === "image" || doc.resourceType === "video" || doc.resourceType === "raw" ? doc.resourceType : null;
  return {
    kind: doc.kind,
    displayName: doc.displayName,
    originalName: doc.originalName,
    cloudinaryPublicId: doc.cloudinaryPublicId,
    resourceType,
    deliveryType: doc.deliveryType ?? "upload",
  };
}

/** Removes the library record. Returns false when there was nothing to remove (already deleted). */
export async function deleteFileRecord(ownerId: string, id: string): Promise<boolean> {
  if (!isObjectIdString(id)) return false;
  const collection = await files();
  const result = await collection.deleteOne({ _id: new ObjectId(id), ownerId });
  return result.deletedCount === 1;
}

export interface FileNeighbors {
  /** 1-based position in the library, newest first. */
  position: number;
  total: number;
  /** The newer item (shown before this one), if any. */
  previousId: string | null;
  /** The older item (shown after this one), if any. */
  nextId: string | null;
}

/**
 * Where an item sits in the owner's library (newest first, the default library order), and the ids
 * of the items before and after it. Ties on createdAt are broken by _id, like the library sort.
 */
export async function getFileNeighbors(ownerId: string, id: string): Promise<FileNeighbors | null> {
  if (!isObjectIdString(id)) return null;
  const collection = await files();
  const _id = new ObjectId(id);
  const doc = await collection.findOne({ _id, ownerId }, { projection: { createdAt: 1 } });
  if (!doc) return null;
  const { createdAt } = doc;

  const newer: Filter<FileDocument> = { ownerId, $or: [{ createdAt: { $gt: createdAt } }, { createdAt, _id: { $gt: _id } }] };
  const older: Filter<FileDocument> = { ownerId, $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: _id } }] };

  const [newerCount, total, previous, next] = await Promise.all([
    collection.countDocuments(newer),
    collection.countDocuments({ ownerId }),
    collection.findOne(newer, { sort: { createdAt: 1, _id: 1 }, projection: { _id: 1 } }),
    collection.findOne(older, { sort: { createdAt: -1, _id: -1 }, projection: { _id: 1 } }),
  ]);

  return {
    position: newerCount + 1,
    total,
    previousId: previous?._id.toHexString() ?? null,
    nextId: next?._id.toHexString() ?? null,
  };
}

export async function getFileById(ownerId: string, id: string): Promise<FileItem | null> {
  if (!isObjectIdString(id)) return null;
  const collection = await files();
  const doc = await collection.findOne({ _id: new ObjectId(id), ownerId });
  return doc ? toFileItem(doc) : null;
}

export async function getFileByCloudinaryPublicId(ownerId: string, publicId: string): Promise<FileItem | null> {
  const collection = await files();
  const doc = await collection.findOne({ ownerId, cloudinaryPublicId: publicId });
  return doc ? toFileItem(doc) : null;
}

export async function createLinkItem(ownerId: string, input: CreateLinkInput): Promise<FileItem> {
  const collection = await files();
  const now = new Date();
  const doc: FileDocument = {
    _id: new ObjectId(),
    ownerId,
    kind: "link",
    displayName: input.title || hostnameOf(input.url),
    originalName: null,
    mimeType: null,
    originalSizeBytes: 0,
    storedSizeBytes: null,
    linkUrl: input.url,
    note: input.note || null,
    tags: [],
    isFavorite: false,
    cloudinaryAssetId: null,
    cloudinaryPublicId: null,
    resourceType: null,
    secureUrl: null,
    thumbnailUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(doc);
  return toFileItem(doc);
}

export async function createNoteItem(ownerId: string, input: CreateNoteInput): Promise<FileItem> {
  const collection = await files();
  const now = new Date();
  const doc: FileDocument = {
    _id: new ObjectId(),
    ownerId,
    kind: "note",
    displayName: input.title || deriveNoteTitle(input.text),
    originalName: null,
    mimeType: "text/plain",
    originalSizeBytes: Buffer.byteLength(input.text, "utf8"),
    storedSizeBytes: null,
    linkUrl: null,
    note: input.text,
    tags: [],
    isFavorite: false,
    cloudinaryAssetId: null,
    cloudinaryPublicId: null,
    resourceType: null,
    secureUrl: null,
    thumbnailUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(doc);
  return toFileItem(doc);
}

/**
 * Saves a verified Cloudinary upload. Repeating the call with the same public ID returns the same item.
 * When the browser compressed the file, originalSizeBytes records the size before compression and
 * storedSizeBytes the size Cloudinary reports.
 */
export async function saveUploadedItem(
  ownerId: string,
  pending: { kind: FileKind; originalName: string; mimeType: string; deliveryType: CloudinaryDeliveryType },
  asset: CloudinaryAsset,
  compression: FileCompression | null = null,
): Promise<FileItem> {
  const collection = await files();
  const now = new Date();
  const fields: Omit<FileDocument, "_id" | "ownerId" | "createdAt" | "updatedAt" | "cloudinaryPublicId"> = {
    kind: pending.kind,
    displayName: pending.originalName,
    originalName: pending.originalName,
    mimeType: pending.mimeType,
    originalSizeBytes: compression ? compression.originalBytes : asset.bytes,
    storedSizeBytes: asset.bytes,
    linkUrl: null,
    note: null,
    tags: [],
    isFavorite: false,
    cloudinaryAssetId: asset.asset_id,
    resourceType: asset.resource_type,
    secureUrl: asset.secure_url,
    thumbnailUrl: null,
    deliveryType: pending.deliveryType,
    compression,
  };

  const doc = await collection.findOneAndUpdate(
    { ownerId, cloudinaryPublicId: asset.public_id },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        ownerId,
        cloudinaryPublicId: asset.public_id,
        ...fields,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new Error("Saved upload was not returned");
  return toFileItem(doc);
}

export async function updateFileItem(
  ownerId: string,
  id: string,
  input: UpdateItemInput,
): Promise<FileItem | null> {
  if (!isObjectIdString(id)) return null;
  const collection = await files();

  const set: Partial<FileDocument> = { updatedAt: new Date() };
  if (input.displayName !== undefined) set.displayName = input.displayName;
  if (input.note !== undefined) set.note = input.note || null;
  if (input.tags !== undefined) set.tags = [...new Set(input.tags)];
  if (input.isFavorite !== undefined) set.isFavorite = input.isFavorite;

  const doc = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId },
    { $set: set },
    { returnDocument: "after" },
  );
  return doc ? toFileItem(doc) : null;
}
