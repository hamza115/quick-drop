"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";
import { useUploads } from "@/components/uploads/upload-provider";
import { acceptAttribute } from "@/lib/uploads/policy";

interface UploadButtonProps {
  label?: string;
  variant?: "primary" | "secondary" | "soft";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: IconName;
}

export function UploadButton({
  label = "Upload files",
  variant = "primary",
  size = "md",
  className,
  icon = "upload",
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => inputRef.current?.click()}>
        <Icon name={icon} className="size-[1.125rem]" />
        {label}
      </Button>
      <FilePickerInput inputRef={inputRef} />
    </>
  );
}

/** Hidden file input wired to the upload queue. `capture` opens the camera on phones. */
export function FilePickerInput({
  inputRef,
  capture,
  accept,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  capture?: "environment" | "user";
  accept?: string;
}) {
  const { enqueueFiles } = useUploads();
  return (
    <input
      ref={inputRef}
      type="file"
      multiple={!capture}
      accept={accept ?? acceptAttribute()}
      capture={capture}
      aria-label={capture ? "Take a photo or video to upload" : "Choose files to upload"}
      className="hidden"
      onChange={(event) => {
        const chosen = Array.from(event.currentTarget.files ?? []);
        // Reset so choosing the same file again still fires a change event.
        event.currentTarget.value = "";
        if (chosen.length > 0) enqueueFiles(chosen);
      }}
    />
  );
}
