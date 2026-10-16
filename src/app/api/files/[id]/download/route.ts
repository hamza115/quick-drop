import { NextResponse, type NextRequest } from "next/server";
import { apiError, getApiUserId, handleApiError, rejectRateLimited } from "@/lib/api/route";
import { CloudinaryNotConfiguredError, downloadUrlFor } from "@/lib/cloudinary/server";
import { attachmentBaseName } from "@/lib/files/download";
import { getFileAssetRef, getFileById } from "@/lib/files/repository";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Downloads an item. Uploaded files redirect to a Cloudinary download URL (the file itself never
 * passes through this server). Notes download as a .txt file. Links have nothing to download.
 * With ?mode=json the route returns { url } instead, so the page can show errors as messages.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const wantsJson = request.nextUrl.searchParams.get("mode") === "json";
  const userId = await getApiUserId();
  if (!userId) {
    return wantsJson
      ? apiError(401, "unauthenticated", "Sign in to download files.")
      : NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  try {
    const limited = await rejectRateLimited(userId, RATE_LIMITS.download);
    if (limited) return limited;

    const ref = await getFileAssetRef(userId, id);
    if (!ref) return apiError(404, "not_found", "That item doesn't exist.");

    if (ref.kind === "note") {
      if (wantsJson) return NextResponse.json({ url: `/api/files/${encodeURIComponent(id)}/download` });
      const item = await getFileById(userId, id);
      const fileName = `${attachmentBaseName(ref.displayName)}.txt`;
      return new NextResponse(item?.note ?? "", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!ref.cloudinaryPublicId || !ref.resourceType) {
      return apiError(400, "nothing_to_download", "Links don't have a file to download. Open or copy the link instead.");
    }

    const url = downloadUrlFor(
      ref.cloudinaryPublicId,
      ref.resourceType,
      ref.deliveryType,
      attachmentBaseName(ref.originalName ?? ref.displayName),
    );
    if (wantsJson) return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return apiError(503, "uploads_unavailable", "Storage isn't set up, so files can't be downloaded yet.");
    }
    return handleApiError("download item", error);
  }
}
