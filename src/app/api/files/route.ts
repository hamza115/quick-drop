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
import { createLinkItem, createNoteItem, listFiles } from "@/lib/files/repository";
import { createItemSchema, listQuerySchema } from "@/lib/files/validation";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to see your files.");

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return apiError(400, "invalid_query", firstIssueMessage(parsed.error));

  try {
    return NextResponse.json(await listFiles(userId, parsed.data));
  } catch (error) {
    return handleApiError("list files", error);
  }
}

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to save items.");

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the item as JSON.");

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  try {
    const limited = await rejectRateLimited(userId, RATE_LIMITS.createItem);
    if (limited) return limited;

    const item =
      parsed.data.type === "link"
        ? await createLinkItem(userId, parsed.data)
        : await createNoteItem(userId, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError("create item", error);
  }
}
