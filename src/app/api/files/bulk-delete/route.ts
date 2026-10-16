import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
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
import { RATE_LIMITS } from "@/lib/security/rate-limit";

const MAX_BULK_DELETE = 100;

const bulkDeleteSchema = z
  .object({
    ids: z
      .array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid item reference."))
      .min(1, "Choose at least one item.")
      .max(MAX_BULK_DELETE, `Delete up to ${MAX_BULK_DELETE} items at a time.`),
  })
  .strict();

/**
 * Deletes several items, one after another, with the same rules as a single delete.
 * Always answers 200 with what happened to each item, so the page can report partial results.
 */
export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to delete items.");

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the item list as JSON.");

  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  try {
    // One rate-limit unit per request; the batch size is capped above.
    const limited = await rejectRateLimited(userId, RATE_LIMITS.deleteItem);
    if (limited) return limited;

    const ids = [...new Set(parsed.data.ids.map((id) => id.toLowerCase()))];
    const deleted: string[] = [];
    const failed: Array<{ id: string; code: string; message: string }> = [];

    for (const id of ids) {
      const outcome = await deleteItem(userId, id);
      if (outcome.ok || outcome.code === "not_found") deleted.push(id);
      else failed.push({ id, code: outcome.code, message: outcome.message });
    }

    return NextResponse.json({ deleted, failed });
  } catch (error) {
    return handleApiError("bulk delete", error);
  }
}
