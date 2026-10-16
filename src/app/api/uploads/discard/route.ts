import { NextResponse, type NextRequest } from "next/server";
import { apiError, firstIssueMessage, getApiUserId, handleApiError, readJson, rejectCrossOrigin } from "@/lib/api/route";
import { CloudinaryNotConfiguredError, destroyAsset } from "@/lib/cloudinary/server";
import { getFileByCloudinaryPublicId } from "@/lib/files/repository";
import { deletePendingUpload, deliveryTypeOf, findPendingUpload } from "@/lib/uploads/repository";
import { discardUploadSchema } from "@/lib/uploads/validation";

/** Removes an upload that was cancelled before it was saved. Saved items are never removed here. */
export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to change uploads.");

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the upload details as JSON.");

  const parsed = discardUploadSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  const { publicId } = parsed.data;

  try {
    const pending = await findPendingUpload(userId, publicId);
    if (!pending) {
      if (await getFileByCloudinaryPublicId(userId, publicId)) {
        return apiError(409, "already_saved", "This upload is already saved in your library.");
      }
      return NextResponse.json({ ok: true });
    }

    try {
      await destroyAsset(publicId, pending.resourceType, deliveryTypeOf(pending));
    } catch {
      // Keep the pending record so the discard can be retried.
      return apiError(502, "storage_unavailable", "Couldn't remove the upload from storage. Try again.");
    }
    await deletePendingUpload(userId, publicId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return apiError(503, "uploads_unavailable", "Uploads aren't set up yet.");
    }
    return handleApiError("discard upload", error);
  }
}
