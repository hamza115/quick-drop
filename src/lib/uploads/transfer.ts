import type { UploadedAsset, UploadSignature } from "@/lib/uploads/types";

export class UploadError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "UploadError";
    this.retryable = retryable;
  }
}

function messageForStatus(status: number): string {
  if (status === 0) return "Connection lost during upload. Retry to try again.";
  if (status === 401 || status === 403) return "Uploads aren't allowed right now. Refresh the page and try again.";
  if (status === 400 || status === 413 || status === 415) return "The upload service rejected this file. Check its type and size.";
  if (status === 429 || status >= 500) return "The upload service is busy. Try again in a moment.";
  return "Upload failed. Try again.";
}

function readUploadResponse(text: string): UploadedAsset | null {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    if (
      typeof body.public_id === "string" &&
      typeof body.asset_id === "string" &&
      typeof body.resource_type === "string" &&
      typeof body.bytes === "number"
    ) {
      return {
        publicId: body.public_id,
        assetId: body.asset_id,
        resourceType: body.resource_type as UploadedAsset["resourceType"],
        bytes: body.bytes,
      };
    }
  } catch {
    // Fall through to null.
  }
  return null;
}

/**
 * Sends the file straight to Cloudinary using the signed parameters.
 * Progress is reported when the browser can measure it. Aborting the signal cancels the request.
 */
export function sendToCloudinary({
  signature,
  file,
  signal,
  onProgress,
}: {
  signature: UploadSignature;
  file: File;
  signal: AbortSignal;
  onProgress: (progress: number | null) => void;
}): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }

    const request = new XMLHttpRequest();
    const form = new FormData();
    for (const [key, value] of Object.entries(signature.params)) {
      form.append(key, value);
    }
    form.append("api_key", signature.apiKey);
    form.append("signature", signature.signature);
    form.append("file", file, file.name);

    const abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });

    request.open("POST", signature.uploadUrl);
    request.upload.onprogress = (event) => {
      onProgress(event.lengthComputable && event.total > 0 ? event.loaded / event.total : null);
    };
    request.onload = () => {
      signal.removeEventListener("abort", abort);
      const asset = request.status >= 200 && request.status < 300 ? readUploadResponse(request.responseText) : null;
      if (asset) {
        resolve(asset);
        return;
      }
      const retryable = request.status === 0 || request.status === 429 || request.status >= 500;
      reject(new UploadError(messageForStatus(request.status), retryable));
    };
    request.onerror = () => {
      signal.removeEventListener("abort", abort);
      reject(new UploadError(messageForStatus(0), true));
    };
    request.onabort = () => {
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    request.send(form);
  });
}
