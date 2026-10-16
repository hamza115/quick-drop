import "server-only";
import { NextResponse } from "next/server";
import { apiError, getApiUserId, handleApiError } from "@/lib/api/route";
import {
  CloudinaryNotConfiguredError,
  deliveryUrlFor,
  thumbnailDeliveryUrlFor,
} from "@/lib/cloudinary/server";
import { getFileAssetRef } from "@/lib/files/repository";

const PDF_CHECK_TIMEOUT_MS = 8_000;

/**
 * Checks, from the server, that Cloudinary will actually deliver this PDF. The browser can't tell a
 * refused PDF from a working one inside a preview frame, so the viewer asks this instead.
 */
export async function pdfPreviewAvailable(ownerId: string, id: string): Promise<boolean> {
  try {
    const ref = await getFileAssetRef(ownerId, id);
    if (!ref?.cloudinaryPublicId || !ref.resourceType) return false;
    const url = deliveryUrlFor(ref.cloudinaryPublicId, ref.resourceType, ref.deliveryType);
    const response = await fetch(url, {
      headers: { Range: "bytes=0-7" },
      cache: "no-store",
      signal: AbortSignal.timeout(PDF_CHECK_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const head = Buffer.from(await response.arrayBuffer()).toString("latin1");
    return head.startsWith("%PDF");
  } catch {
    return false;
  }
}

/**
 * How long the browser may reuse a redirect. The signed URL itself stays valid until the file is
 * deleted, so this only saves round trips; the response is private, never stored by shared caches.
 */
const REDIRECT_MAX_AGE_SECONDS = 60 * 60;

/** Checks the session and owner, then redirects to a signed Cloudinary URL for the file or its thumbnail. */
export async function redirectToSignedFile(
  id: string,
  variant: "content" | "thumbnail",
): Promise<NextResponse> {
  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to open this file.");

  try {
    const ref = await getFileAssetRef(userId, id);
    if (!ref?.cloudinaryPublicId || !ref.resourceType) {
      return apiError(404, "not_found", "That file doesn't exist.");
    }
    const url =
      variant === "content"
        ? deliveryUrlFor(ref.cloudinaryPublicId, ref.resourceType, ref.deliveryType)
        : thumbnailDeliveryUrlFor(ref.cloudinaryPublicId, ref.resourceType, ref.deliveryType);
    if (!url) return apiError(404, "no_thumbnail", "This file has no preview image.");

    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": `private, max-age=${REDIRECT_MAX_AGE_SECONDS}`, Vary: "Cookie" },
    });
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return apiError(503, "uploads_unavailable", "Storage isn't set up, so files can't be opened yet.");
    }
    return handleApiError(`open ${variant}`, error);
  }
}
