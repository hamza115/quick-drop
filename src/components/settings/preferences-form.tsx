"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SaveStatus, Segmented, SettingRow, SettingsGroup, type SaveState } from "@/components/settings/settings-ui";
import { selectClasses } from "@/components/ui/field-styles";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { SORT_LABELS, SORT_OPTIONS, type SortOption } from "@/lib/files/constants";
import {
  UPLOAD_CAP_OPTIONS,
  uploadCapLabel,
  type UploadCapMb,
  type UserPreferences,
} from "@/lib/preferences/constants";

/**
 * Library defaults and the personal upload limit, as a settings group. Each change saves to the
 * account straight away, so it applies on every device.
 */
export function LibrarySettingsGroup({ id, initial }: { id: string; initial: UserPreferences }) {
  const router = useRouter();
  const toast = useToast();
  const [prefs, setPrefs] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  async function update(changes: Partial<UserPreferences>) {
    const previous = prefs;
    setPrefs({ ...prefs, ...changes }); // optimistic
    setState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    try {
      const { preferences } = await apiRequest<{ preferences: UserPreferences }>("/api/preferences", {
        method: "PATCH",
        body: changes,
      });
      setPrefs(preferences);
      setState("saved");
      timer.current = window.setTimeout(() => setState("idle"), 2000);
      router.refresh();
    } catch (error) {
      setPrefs(previous);
      setState("error");
      toast.show(error instanceof ApiError ? error.message : "Couldn't save your settings. Try again.", "error");
    }
  }

  return (
    <SettingsGroup
      id={id}
      icon="folderOpen"
      title="Library"
      description="How your library opens, and how big uploads can be."
      scope="All devices"
      status={<SaveStatus state={state} />}
    >
      <SettingRow
        label="Default view"
        description="Used when you open the library."
        stackOnMobile
        control={
          <Segmented
            label="Default view"
            value={prefs.defaultView}
            onChange={(defaultView) => void update({ defaultView })}
            options={[
              { value: "grid", label: "Grid", icon: "grid" },
              { value: "list", label: "List", icon: "list" },
            ]}
          />
        }
      />

      <SettingRow
        label="Default sort"
        htmlFor="default-sort"
        description="You can still change it any time in the library."
        stackOnMobile
        control={
          <select
            id="default-sort"
            value={prefs.defaultSort}
            onChange={(event) => void update({ defaultSort: event.currentTarget.value as SortOption })}
            className={cn(selectClasses, "sm:w-52")}
          >
            {SORT_OPTIONS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        }
      />

      <SettingRow
        label="Largest file you can upload"
        htmlFor="upload-cap"
        description="Can only lower the limits: images 10 MB, videos and ZIP 100 MB, documents 25 MB."
        stackOnMobile
        control={
          <select
            id="upload-cap"
            value={prefs.maxUploadMb === null ? "" : String(prefs.maxUploadMb)}
            onChange={(event) => {
              const value = event.currentTarget.value;
              void update({ maxUploadMb: (value === "" ? null : Number(value)) as UploadCapMb });
            }}
            className={cn(selectClasses, "sm:w-52")}
          >
            {UPLOAD_CAP_OPTIONS.map((option) => (
              <option key={option ?? "none"} value={option === null ? "" : String(option)}>
                {uploadCapLabel(option)}
              </option>
            ))}
          </select>
        }
      />
    </SettingsGroup>
  );
}
