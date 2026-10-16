import { z } from "zod";
import { SORT_OPTIONS, VIEW_MODES, type SortOption, type ViewMode } from "@/lib/files/constants";

// Client-safe. Account-wide preferences, stored on the server so they follow the user across devices.
// Image compression settings are different: they are per browser (see lib/compression/settings.ts).

/** Personal upload caps offered in settings, in MB. null means "the limit for each file type". */
export const UPLOAD_CAP_OPTIONS = [null, 5, 10, 25, 50] as const;
export type UploadCapMb = (typeof UPLOAD_CAP_OPTIONS)[number];

export interface UserPreferences {
  defaultView: ViewMode;
  defaultSort: SortOption;
  /** Lowers the per-type limits for this account. It can never raise them. */
  maxUploadMb: UploadCapMb;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultView: "grid",
  defaultSort: "newest",
  maxUploadMb: null,
};

export const updatePreferencesSchema = z
  .object({
    defaultView: z.enum(VIEW_MODES),
    defaultSort: z.enum(SORT_OPTIONS),
    maxUploadMb: z.union([z.null(), z.literal([5, 10, 25, 50])]),
  })
  .partial()
  .strict();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export function uploadCapLabel(value: UploadCapMb): string {
  return value === null ? "Limit for each file type" : `${value} MB`;
}

/** The limit that applies to one file: the type's limit, lowered by the personal cap when it is set. */
export function effectiveMaxBytes(ruleMaxBytes: number, maxUploadMb: UploadCapMb): number {
  return maxUploadMb === null ? ruleMaxBytes : Math.min(ruleMaxBytes, maxUploadMb * 1024 * 1024);
}
