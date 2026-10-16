// Browser-only clipboard helpers.

/** True when this browser can put an image on the clipboard. */
export function canCopyImages(): boolean {
  return (
    typeof window !== "undefined" &&
    "ClipboardItem" in window &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}

/** Browsers reliably accept only PNG images on the clipboard, so other formats are converted. */
async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("PNG conversion failed"))), "image/png"),
    );
  } finally {
    bitmap.close();
  }
}

/**
 * Copies the image at a URL to the clipboard. The ClipboardItem receives a promise so that Safari
 * still treats the write as part of the click. Throws when permission, format or CORS blocks it.
 */
export async function copyImageFromUrl(url: string): Promise<void> {
  // Same-origin request with the session cookie; QuickDrop redirects to a signed Cloudinary URL.
  const png = fetch(url, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`Image request failed (${response.status})`);
      return response.blob();
    })
    .then(toPng);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
