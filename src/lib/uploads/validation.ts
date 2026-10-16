import { z } from "zod";

// Client-safe schemas shared by the upload routes.

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const signUploadSchema = z.object({
  name: z.string().trim().min(1, "Choose a file.").max(255, "That file name is too long."),
  size: z.number().int().positive("This file is empty.").max(MAX_UPLOAD_BYTES, "This file is too large."),
});

/** Upper bound for the reported pre-compression size. Images larger than this are refused before compression. */
export const MAX_ORIGINAL_BYTES = 4 * MAX_UPLOAD_BYTES;

export const completeUploadSchema = z.object({
  publicId: z.string().min(1).max(300),
  assetId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid upload reference."),
  resourceType: z.enum(["image", "video", "raw"]),
  /**
   * Sent only when the browser compressed the file. These values are informational (shown to the
   * owner); the stored size always comes from Cloudinary.
   */
  compression: z
    .object({
      originalBytes: z.number().int().positive().max(MAX_ORIGINAL_BYTES),
      originalName: z.string().trim().min(1).max(255),
    })
    .strict()
    .optional(),
});

export const discardUploadSchema = z.object({
  publicId: z.string().min(1).max(300),
});
