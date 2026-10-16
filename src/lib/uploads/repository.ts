import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { FileKind } from "@/lib/files/constants";
import type { CloudinaryDeliveryType } from "@/lib/cloudinary/server";
import type { CloudinaryResourceType } from "@/lib/uploads/policy";

/*
 * A pending upload is written when the server signs an upload, and removed when the
 * file is saved. The save step trusts only these fields, never values sent by the browser.
 *
 * expiresAt: after this, the upload can no longer be saved, and the cleanup job removes the
 * file from Cloudinary. purgeAt: MongoDB deletes the record itself, as a last resort, much later,
 * so the cleanup job has time to find it.
 */

const COLLECTION = "uploads";
const PENDING_TTL_MS = 60 * 60 * 1000;
const PURGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingUpload {
  _id: ObjectId;
  ownerId: string;
  publicId: string;
  kind: FileKind;
  resourceType: CloudinaryResourceType;
  /** Missing on records written before private delivery; those were public ("upload"). */
  deliveryType?: CloudinaryDeliveryType;
  originalName: string;
  mimeType: string;
  maxBytes: number;
  createdAt: Date;
  expiresAt: Date;
  purgeAt: Date;
}

let indexesReady: Promise<void> | undefined;

async function pendingUploads(): Promise<Collection<PendingUpload>> {
  const collection = getDb().collection<PendingUpload>(COLLECTION);
  indexesReady ??= collection
    // An earlier version removed records as soon as they expired, which hid orphans from cleanup.
    .dropIndex("expiresAt_ttl")
    .catch(() => undefined)
    .then(() =>
      collection.createIndexes([
        { key: { publicId: 1 }, name: "publicId_unique", unique: true },
        { key: { expiresAt: 1 }, name: "expiresAt" },
        { key: { purgeAt: 1 }, name: "purgeAt_ttl", expireAfterSeconds: 0 },
      ]),
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

export async function createPendingUpload(
  input: Pick<
    PendingUpload,
    "ownerId" | "publicId" | "kind" | "resourceType" | "deliveryType" | "originalName" | "mimeType" | "maxBytes"
  >,
): Promise<void> {
  const collection = await pendingUploads();
  const now = new Date();
  await collection.insertOne({
    _id: new ObjectId(),
    ...input,
    createdAt: now,
    expiresAt: new Date(now.getTime() + PENDING_TTL_MS),
    purgeAt: new Date(now.getTime() + PURGE_AFTER_MS),
  });
}

export async function findPendingUpload(ownerId: string, publicId: string): Promise<PendingUpload | null> {
  const collection = await pendingUploads();
  return collection.findOne({ ownerId, publicId, expiresAt: { $gt: new Date() } });
}

export function deliveryTypeOf(record: { deliveryType?: CloudinaryDeliveryType | null }): CloudinaryDeliveryType {
  return record.deliveryType ?? "upload";
}

/** For the cleanup job only: expired uploads of every user, oldest first. */
export async function listExpiredPendingUploads(limit: number): Promise<PendingUpload[]> {
  const collection = await pendingUploads();
  return collection.find({ expiresAt: { $lte: new Date() } }, { sort: { expiresAt: 1 }, limit }).toArray();
}

export async function deletePendingUpload(ownerId: string, publicId: string): Promise<void> {
  const collection = await pendingUploads();
  await collection.deleteOne({ ownerId, publicId });
}
