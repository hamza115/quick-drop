import { NextResponse, type NextRequest } from "next/server";
import { apiError, firstIssueMessage, getApiUserId, handleApiError, readJson, rejectCrossOrigin } from "@/lib/api/route";
import { CloudinaryNotConfiguredError, destroyAsset, fetchUploadedAsset } from "@/lib/cloudinary/server";
import { getFileByCloudinaryPublicId, saveUploadedItem } from "@/lib/files/repository";
import type { FileCompression } from "@/lib/files/constants";
import { sanitizeFileName } from "@/lib/uploads/policy";
import { deletePendingUpload, deliveryTypeOf, findPendingUpload } from "@/lib/uploads/repository";
import { completeUploadSchema } from "@/lib/uploads/validation";

/**
 * Step 2 of an upload: checks the file Cloudinary reports against the pending record the server
 * created, then saves the library item. Only the pending record is trusted for name and type.
 */
export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to upload files.");

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the upload details as JSON.");

  const parsed = completeUploadSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  const { publicId, assetId, resourceType, compression: reported } = parsed.data;

  try {
    const pending = await findPendingUpload(userId, publicId);
    if (!pending) {
      // Already saved? A retry after a lost response should not create a second item.
      const existing = await getFileByCloudinaryPublicId(userId, publicId);
      if (existing) return NextResponse.json({ item: existing });
      return apiError(404, "upload_not_found", "We couldn't find that upload. Upload the file again.");
    }

    if (pending.resourceType !== resourceType) {
      return apiError(400, "upload_mismatch", "That upload doesn't match what was approved. Upload the file again.");
    }

    const deliveryType = deliveryTypeOf(pending);
    const asset = await fetchUploadedAsset(publicId, pending.resourceType, deliveryType);
    if (!asset || asset.asset_id !== assetId || asset.type !== deliveryType) {
      return apiError(400, "upload_not_found", "The upload didn't finish. Try again.");
    }

    if (asset.bytes > pending.maxBytes) {
      // The signature cannot limit size, so the server enforces it after the upload.
      await destroyAsset(publicId, pending.resourceType, deliveryType);
      await deletePendingUpload(userId, publicId);
      return apiError(413, "too_large", "This file is larger than the limit for its type.");
    }

    // Compression details come from the browser, so they are kept only when they are plausible:
    // an image or video whose reported original is larger than what Cloudinary stored.
    const compression: FileCompression | null =
      reported && (pending.kind === "image" || pending.kind === "video") && reported.originalBytes > asset.bytes
        ? {
            originalName: sanitizeFileName(reported.originalName),
            originalBytes: reported.originalBytes,
            outputType: pending.mimeType,
          }
        : null;

    const item = await saveUploadedItem(userId, { ...pending, deliveryType }, asset, compression);
    await deletePendingUpload(userId, publicId);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return apiError(503, "uploads_unavailable", "Uploads aren't set up yet. Ask the app owner to add the Cloudinary settings.");
    }
    return handleApiError("complete upload", error);
  }
}
