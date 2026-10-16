import "server-only";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import {
  DEFAULT_PREFERENCES,
  updatePreferencesSchema,
  type UpdatePreferencesInput,
  type UserPreferences,
} from "@/lib/preferences/constants";

// One document per user, keyed by the user id from the verified session.

const COLLECTION = "preferences";

interface PreferencesDocument extends Partial<UserPreferences> {
  _id: string;
  updatedAt: Date;
}

function preferences(): Collection<PreferencesDocument> {
  return getDb().collection<PreferencesDocument>(COLLECTION);
}

/** Stored values merged over the defaults. Invalid stored values are ignored field by field. */
function withDefaults(doc: PreferencesDocument | null): UserPreferences {
  if (!doc) return DEFAULT_PREFERENCES;
  const stored = updatePreferencesSchema.shape;
  const view = stored.defaultView.safeParse(doc.defaultView);
  const sort = stored.defaultSort.safeParse(doc.defaultSort);
  const cap = stored.maxUploadMb.safeParse(doc.maxUploadMb);
  return {
    defaultView: (view.success && view.data) || DEFAULT_PREFERENCES.defaultView,
    defaultSort: (sort.success && sort.data) || DEFAULT_PREFERENCES.defaultSort,
    maxUploadMb: cap.success && cap.data !== undefined ? cap.data : DEFAULT_PREFERENCES.maxUploadMb,
  };
}

export async function getPreferences(ownerId: string): Promise<UserPreferences> {
  return withDefaults(await preferences().findOne({ _id: ownerId }));
}

export async function updatePreferences(ownerId: string, input: UpdatePreferencesInput): Promise<UserPreferences> {
  const doc = await preferences().findOneAndUpdate(
    { _id: ownerId },
    { $set: { ...input, updatedAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );
  return withDefaults(doc);
}
