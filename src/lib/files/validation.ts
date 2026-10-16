import { z } from "zod";
import { PAGE_SIZE, SORT_OPTIONS, TYPE_FILTERS } from "@/lib/files/constants";

// Client-safe: this module is imported by both the browser forms and the API routes.

export const LIMITS = {
  title: 200,
  note: 5000,
  url: 2048,
  tags: 20,
  tagLength: 32,
  search: 200,
} as const;

/** Adds https:// to bare domains such as "example.com". Leaves anything with another scheme alone. */
export function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^[^\s/:]+\.[a-z]{2,}(?::\d+)?(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/** Returns a URL only for plain http(s) addresses without embedded credentials. */
export function parseWebUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || !url.hostname) return null;
  return url;
}

const titleField = z.string().trim().max(LIMITS.title, `Keep titles under ${LIMITS.title} characters.`);
const noteField = z.string().trim().max(LIMITS.note, `Keep notes under ${LIMITS.note} characters.`);
const tagsField = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Tags can't be empty.")
      .max(LIMITS.tagLength, `Keep each tag under ${LIMITS.tagLength} characters.`),
  )
  .max(LIMITS.tags, `Use at most ${LIMITS.tags} tags.`);

export const createLinkSchema = z
  .object({
    type: z.literal("link"),
    url: z
      .string()
      .trim()
      .min(1, "Enter a link.")
      .max(LIMITS.url, "That link is too long.")
      .transform((value, ctx) => {
        const url = parseWebUrl(normalizeUrlInput(value));
        if (!url) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid web address starting with https:// or http://.",
          });
          return z.NEVER;
        }
        return url.href;
      }),
    title: titleField.optional(),
    note: noteField.optional(),
  })
  .strict();

export const createNoteSchema = z
  .object({
    type: z.literal("note"),
    text: z.string().trim().min(1, "Write something first.").max(LIMITS.note, `Keep notes under ${LIMITS.note} characters.`),
    title: titleField.optional(),
  })
  .strict();

export const createItemSchema = z.discriminatedUnion("type", [createLinkSchema, createNoteSchema]);

/** Only these fields can be edited. Unknown keys (such as ownerId) are rejected. */
export const updateItemSchema = z
  .object({
    displayName: z.string().trim().min(1, "Give it a title.").max(LIMITS.title, `Keep titles under ${LIMITS.title} characters.`).optional(),
    note: noteField.optional(),
    tags: tagsField.optional(),
    isFavorite: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });

export const listQuerySchema = z.object({
  type: z.enum(TYPE_FILTERS).default("all"),
  favorites: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
  q: z.string().trim().max(LIMITS.search).default(""),
  sort: z.enum(SORT_OPTIONS).default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PAGE_SIZE),
});

export type CreateItemInput = z.output<typeof createItemSchema>;
export type CreateLinkInput = Extract<CreateItemInput, { type: "link" }>;
export type CreateNoteInput = Extract<CreateItemInput, { type: "note" }>;
export type UpdateItemInput = z.output<typeof updateItemSchema>;
export type ListQuery = z.output<typeof listQuerySchema>;
