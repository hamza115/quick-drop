import { NextResponse, type NextRequest } from "next/server";
import {
  apiError,
  firstIssueMessage,
  getApiUserId,
  handleApiError,
  readJson,
  rejectCrossOrigin,
} from "@/lib/api/route";
import { updatePreferencesSchema } from "@/lib/preferences/constants";
import { getPreferences, updatePreferences } from "@/lib/preferences/repository";

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to see your settings.");

  try {
    return NextResponse.json({ preferences: await getPreferences(userId) });
  } catch (error) {
    return handleApiError("get preferences", error);
  }
}

export async function PATCH(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to change your settings.");

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the settings as JSON.");

  const parsed = updatePreferencesSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  try {
    return NextResponse.json({ preferences: await updatePreferences(userId, parsed.data) });
  } catch (error) {
    return handleApiError("update preferences", error);
  }
}
