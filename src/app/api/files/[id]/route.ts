import { NextResponse, type NextRequest } from "next/server";
import {
  apiError,
  firstIssueMessage,
  getApiUserId,
  handleApiError,
  readJson,
  rejectCrossOrigin,
  rejectRateLimited,
} from "@/lib/api/route";
import { deleteItem } from "@/lib/files/delete";
import { getFileById, updateFileItem } from "@/lib/files/repository";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { updateItemSchema } from "@/lib/files/validation";

type RouteContext = { params: Promise<{ id: string }> };

// A missing item and another owner's item return the same 404, so ids cannot be probed.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to see this item.");

  const { id } = await params;
  try {
    const item = await getFileById(userId, id);
    if (!item) return apiError(404, "not_found", "That item doesn't exist.");
    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError("get item", error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to change this item.");

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the changes as JSON.");

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  const { id } = await params;
  try {
    const item = await updateFileItem(userId, id, parsed.data);
    if (!item) return apiError(404, "not_found", "That item doesn't exist.");
    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError("update item", error);
  }
}

/** Deletes one item. See deleteItem for the order of steps and partial failures. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to delete this item.");

  const { id } = await params;
  try {
    const limited = await rejectRateLimited(userId, RATE_LIMITS.deleteItem);
    if (limited) return limited;

    const outcome = await deleteItem(userId, id);
    if (!outcome.ok) return apiError(outcome.status, outcome.code, outcome.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError("delete item", error);
  }
}
