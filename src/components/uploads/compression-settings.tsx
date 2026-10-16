"use client";

import { useEffect, useRef, useState } from "react";
import { Callout, SaveStatus, Segmented, SettingRow, SettingsGroup, Switch, type SaveState } from "@/components/settings/settings-ui";
import { selectClasses } from "@/components/ui/field-styles";
import { useUploads } from "@/components/uploads/upload-provider";
import { cn } from "@/lib/cn";
import {
  COMPRESSION_PRESETS,
  MAX_DIMENSION_OPTIONS,
  PRESETS,
  VIDEO_RESOLUTION_OPTIONS,
  maxDimensionLabel,
  videoResolutionLabel,
  type CompressionSettings,
} from "@/lib/compression/settings";

/**
 * Compression settings as a settings group. Changes apply straight away and are stored in this
 * browser, so they affect uploads queued afterwards on this device only.
 */
export function CompressionSettingsGroup({ id }: { id: string }) {
  const { compressionSettings: settings, setCompressionSettings } = useUploads();
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function update(changes: Partial<CompressionSettings>) {
    const stored = setCompressionSettings({ ...settings, ...changes });
    setState(stored ? "saved" : "error");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <SettingsGroup
      id={id}
      icon="sparkles"
      title="Uploads & compression"
      description="Shrinks files in your browser before they upload."
      scope="This device"
      status={<SaveStatus state={state} />}
    >
      <SettingRow
        label="Compress images"
        htmlFor="compress-images"
        description="JPG, PNG and WebP. GIFs and documents always upload unchanged."
        control={<Switch id="compress-images" checked={settings.enabled} onChange={(enabled) => update({ enabled })} />}
      />

      <SettingRow
        label="Quality"
        description={PRESETS[settings.preset].description}
        stackOnMobile
        disabled={!settings.enabled && !settings.videoEnabled}
        control={
          <Segmented
            label="Compression quality"
            value={settings.preset}
            disabled={!settings.enabled && !settings.videoEnabled}
            onChange={(preset) => update({ preset })}
            options={COMPRESSION_PRESETS.map((preset) => ({ value: preset, label: PRESETS[preset].label.replace(" quality", "") }))}
          />
        }
      />

      <SettingRow
        label="Maximum image size"
        htmlFor="max-dimension"
        description="Larger images are scaled down; smaller ones are never enlarged."
        stackOnMobile
        disabled={!settings.enabled}
        control={
          <select
            id="max-dimension"
            value={settings.maxDimension}
            disabled={!settings.enabled}
            onChange={(event) => update({ maxDimension: Number(event.currentTarget.value) as CompressionSettings["maxDimension"] })}
            className={cn(selectClasses, "sm:w-52")}
          >
            {MAX_DIMENSION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {maxDimensionLabel(option)}
              </option>
            ))}
          </select>
        }
      >
        <Callout>
          Images keep their format: PNG screenshots stay sharp, lossless PNG and only shrink when scaled down. Photo
          details such as location (EXIF) are removed. If compression wouldn&apos;t help, the original is uploaded.
        </Callout>
      </SettingRow>

      <>
          <SettingRow
            label="Compress videos"
            htmlFor="compress-videos"
            description={
              <>
                MP4, WebM and MOV up to 250 MB, converted to MP4 in your browser.{" "}
                <span className="rounded bg-surface-container px-1.5 py-px text-[11px] font-semibold text-foreground">Experimental</span>
              </>
            }
            control={
              <Switch id="compress-videos" checked={settings.videoEnabled} onChange={(videoEnabled) => update({ videoEnabled })} />
            }
          >
            {settings.videoEnabled ? (
              <Callout tone="warning">
                Can take minutes per video and uses a lot of memory and battery. Keep the tab open. You can always pick
                <strong className="font-semibold"> Use original</strong> in the upload queue.
              </Callout>
            ) : null}
          </SettingRow>

          <SettingRow
            label="Video resolution"
            description="Larger videos are scaled down to this; smaller ones keep their size."
            stackOnMobile
            disabled={!settings.videoEnabled}
            control={
              <Segmented
                label="Video resolution"
                value={settings.videoResolution}
                disabled={!settings.videoEnabled}
                onChange={(videoResolution) => update({ videoResolution })}
                options={VIDEO_RESOLUTION_OPTIONS.map((option) => ({ value: option, label: videoResolutionLabel(option) }))}
              />
            }
          />
      </>
    </SettingsGroup>
  );
}
