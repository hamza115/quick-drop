import type { NextRequest } from "next/server";
import { redirectToSignedFile } from "@/lib/files/delivery";

type RouteContext = { params: Promise<{ id: string }> };

/** Opens the thumbnail of a private file for its signed-in owner (redirect to a signed Cloudinary URL). */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return redirectToSignedFile(id, "thumbnail");
}
