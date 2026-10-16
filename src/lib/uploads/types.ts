import type { CloudinaryResourceType } from "@/lib/uploads/policy";

/** What the server returns before a file is sent to Cloudinary. The params are signed. */
export interface UploadSignature {
  publicId: string;
  resourceType: CloudinaryResourceType;
  uploadUrl: string;
  apiKey: string;
  params: Record<string, string>;
  signature: string;
}

/** What Cloudinary reports after a successful upload. The server checks it again. */
export interface UploadedAsset {
  publicId: string;
  assetId: string;
  resourceType: CloudinaryResourceType;
  bytes: number;
}
