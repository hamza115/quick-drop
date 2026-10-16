import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, handleApiError } from "@/lib/api/route";
import { CloudinaryNotConfiguredError, destroyAsset } from "@/lib/cloudinary/server";
import { getEnv } from "@/lib/env";
import { getFileByCloudinaryPublicId } from "@/lib/files/repository";
import { deletePendingUpload, deliveryTypeOf, listExpiredPendingUploads } from "@/lib/uploads/repository";

/** Per run, so one run stays well inside a serverless time limit. Later runs pick up the rest. */
const BATCH_SIZE = 100;

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Scheduled job (see vercel.json): removes files that were uploaded to Cloudinary but never saved
 * to the library, for example when the browser closed mid-upload. Requires CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return apiError(503, "cron_disabled", "Set CRON_SECRET to enable the cleanup job.");
  if (!authorized(request, secret)) return apiError(401, "unauthorized", "Not allowed.");

  try {
    const expired = await listExpiredPendingUploads(BATCH_SIZE);
    let removed = 0;
    let kept = 0;
    let failed = 0;

    for (const pending of expired) {
      // A saved item must never lose its file, even if its pending record was left behind.
      const saved = await getFileByCloudinaryPublicId(pending.ownerId, pending.publicId);
      if (saved) {
        await deletePendingUpload(pending.ownerId, pending.publicId);
        kept += 1;
        continue;
      }
      try {
        await destroyAsset(pending.publicId, pending.resourceType, deliveryTypeOf(pending));
        await deletePendingUpload(pending.ownerId, pending.publicId);
        removed += 1;
      } catch (error) {
        if (error instanceof CloudinaryNotConfiguredError) throw error;
        failed += 1; // Left in place; the next run tries again.
      }
    }

    return NextResponse.json({ checked: expired.length, removed, kept, failed });
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return apiError(503, "uploads_unavailable", "Cloudinary isn't configured.");
    }
    return handleApiError("cleanup uploads", error);
  }
}
