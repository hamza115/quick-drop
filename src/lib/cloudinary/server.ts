import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { getEnv } from "@/lib/env";
import type { CloudinaryResourceType } from "@/lib/uploads/policy";

export class CloudinaryNotConfiguredError extends Error {
  constructor() {
    super("Cloudinary is not configured");
    this.name = "CloudinaryNotConfiguredError";
  }
}

/**
 * "authenticated" assets can only be delivered through signed URLs, so a file can't be opened by
 * guessing or reusing its plain Cloudinary address. "upload" is the public type, kept so records
 * saved before private delivery still work.
 */
export type CloudinaryDeliveryType = "upload" | "authenticated";

/** New uploads are private. */
export const PRIVATE_DELIVERY_TYPE: CloudinaryDeliveryType = "authenticated";

/** The fields of a Cloudinary asset that QuickDrop uses. */
export interface CloudinaryAsset {
  asset_id: string;
  public_id: string;
  resource_type: CloudinaryResourceType;
  type: string;
  bytes: number;
  secure_url: string;
}

export function getCloudinaryCredentials(): { cloudName: string; apiKey: string; apiSecret: string } {
  const env = getEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new CloudinaryNotConfiguredError();
  }
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

/** Configures the SDK from server-only settings. The secret is never sent to the browser. */
function client() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

/** The configured SDK, for Admin API calls such as the usage report. Server only. */
export function getCloudinaryAdmin() {
  return client();
}

export function signUploadParams(params: Record<string, string | number>): string {
  const { apiSecret } = getCloudinaryCredentials();
  return client().utils.api_sign_request(params, apiSecret);
}

export function uploadEndpoint(resourceType: CloudinaryResourceType): string {
  const { cloudName } = getCloudinaryCredentials();
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

/** Looks up an asset in the account. Returns null when it doesn't exist. */
export async function fetchUploadedAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
): Promise<CloudinaryAsset | null> {
  try {
    return (await client().api.resource(publicId, { resource_type: resourceType, type: deliveryType })) as CloudinaryAsset;
  } catch (error) {
    if ((error as { http_code?: number }).http_code === 404) return null;
    throw error;
  }
}

export async function destroyAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
): Promise<void> {
  const result = (await client().uploader.destroy(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    invalidate: true,
  })) as { result?: string };
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Cloudinary did not confirm the deletion");
  }
}

/**
 * Signed delivery URL for the original file. Only QuickDrop's own routes hand these out, after
 * checking the session and the owner; the browser never stores them.
 */
export function deliveryUrlFor(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
): string {
  return client().url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
    sign_url: deliveryType === "authenticated",
  });
}

/** Signed small preview for grid cards. Images and videos only; other types use an icon. */
export function thumbnailDeliveryUrlFor(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
): string | null {
  const cloud = client();
  const sign_url = deliveryType === "authenticated";
  if (resourceType === "image") {
    return cloud.url(publicId, {
      resource_type: "image",
      type: deliveryType,
      secure: true,
      sign_url,
      transformation: [{ width: 480, height: 480, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" }],
    });
  }
  if (resourceType === "video") {
    return cloud.url(publicId, {
      resource_type: "video",
      type: deliveryType,
      secure: true,
      sign_url,
      format: "jpg",
      transformation: [{ start_offset: 0, width: 480, height: 480, crop: "fill", quality: "auto" }],
    });
  }
  return null;
}

/** How long a signed download link for a document or archive stays valid. */
const DOWNLOAD_LINK_TTL_SECONDS = 5 * 60;

/**
 * A URL that downloads the original file instead of showing it. Images and videos use the
 * attachment flag with a readable name; documents and archives use a short-lived signed link.
 */
export function downloadUrlFor(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
  baseName: string,
): string {
  const cloud = client();
  if (resourceType === "raw") {
    return cloud.utils.private_download_url(publicId, "", {
      resource_type: "raw",
      type: deliveryType,
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS,
    });
  }
  return cloud.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
    sign_url: deliveryType === "authenticated",
    flags: `attachment:${baseName}`,
  });
}
