import { randomBytes } from "node:crypto";
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
import {
  CloudinaryNotConfiguredError,
  PRIVATE_DELIVERY_TYPE,
  getCloudinaryCredentials,
  signUploadParams,
  uploadEndpoint,
} from "@/lib/cloudinary/server";
import { formatBytes } from "@/lib/files/format";
import { wouldExceedQuota } from "@/lib/files/quota";
import { getStorageStatus } from "@/lib/files/repository";
import { effectiveMaxBytes } from "@/lib/preferences/constants";
import { getPreferences } from "@/lib/preferences/repository";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createPendingUpload } from "@/lib/uploads/repository";
import { findUploadRule, sanitizeFileName, supportedTypesDescription } from "@/lib/uploads/policy";
import { signUploadSchema } from "@/lib/uploads/validation";
import type { UploadSignature } from "@/lib/uploads/types";

// Only user ids that are safe inside a Cloudinary public ID.
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Step 1 of an upload: checks the file and returns signed parameters for a direct upload to Cloudinary. */
export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const userId = await getApiUserId();
  if (!userId) return apiError(401, "unauthenticated", "Sign in to upload files.");
  if (!USER_ID_PATTERN.test(userId)) return handleApiError("sign upload", new Error("unsafe user id"));

  const body = await readJson(request);
  if (body === undefined) return apiError(400, "invalid_body", "Send the file details as JSON.");

  const parsed = signUploadSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_input", firstIssueMessage(parsed.error));

  const rule = findUploadRule(parsed.data.name);
  if (!rule) {
    return apiError(415, "unsupported_type", `That file type isn't supported. Accepted types: ${supportedTypesDescription()}.`);
  }

  try {
    const limited = await rejectRateLimited(userId, RATE_LIMITS.uploadSign);
    if (limited) return limited;

    const [preferences, storage] = await Promise.all([getPreferences(userId), getStorageStatus(userId)]);
    const maxBytes = effectiveMaxBytes(rule.maxBytes, preferences.maxUploadMb);
    if (parsed.data.size > maxBytes) {
      const source = maxBytes < rule.maxBytes ? "your upload limit in Settings" : `the limit for this file type`;
      return apiError(413, "too_large", `This ${rule.kind} is larger than ${formatBytes(maxBytes)}, ${source}.`);
    }
    if (wouldExceedQuota(storage.bytes, parsed.data.size, storage.limitBytes)) {
      return apiError(
        413,
        "quota_exceeded",
        "Your storage is full. Delete files you no longer need, then try again.",
      );
    }

    const { apiKey } = getCloudinaryCredentials();
    // Documents and archives keep their extension in the public ID, so delivery and downloads
    // carry the right file type. Images and videos get their format from Cloudinary instead.
    const extension = parsed.data.name.slice(parsed.data.name.lastIndexOf(".") + 1).toLowerCase();
    const suffix = rule.resourceType === "raw" && rule.extensions.includes(extension) ? `.${extension}` : "";
    const publicId = `quickdrop/${userId}/${randomBytes(16).toString("hex")}${suffix}`;
    const params: Record<string, string> = {
      public_id: publicId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      overwrite: "false",
      // Private: the file can only be delivered through URLs signed by this server.
      type: PRIVATE_DELIVERY_TYPE,
    };
    // Restrict image and video uploads to the extensions this rule accepts.
    if (rule.resourceType !== "raw") params.allowed_formats = rule.extensions.join(",");

    const signature = signUploadParams(params);

    await createPendingUpload({
      ownerId: userId,
      publicId,
      kind: rule.kind,
      resourceType: rule.resourceType,
      deliveryType: PRIVATE_DELIVERY_TYPE,
      originalName: sanitizeFileName(parsed.data.name),
      mimeType: rule.mimeType,
      maxBytes,
    });

    const response: UploadSignature = {
      publicId,
      resourceType: rule.resourceType,
      uploadUrl: uploadEndpoint(rule.resourceType),
      apiKey,
      params,
      signature,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return apiError(503, "uploads_unavailable", "Uploads aren't set up yet. Ask the app owner to add the Cloudinary settings.");
    }
    return handleApiError("sign upload", error);
  }
}
