"use client";

import { useRef, useState } from "react";
import { AddItemDialog } from "@/components/library/add-item-button";
import { KIND_GRADIENT_CLASSES } from "@/components/library/file-type-icon";
import { Dialog } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { FilePickerInput } from "@/components/uploads/upload-button";
import { useUploads } from "@/components/uploads/upload-provider";

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
}

/** The phone "+" sheet: every way to add something, as large, thumb-friendly rows. */
export function AddSheet({ open, onClose }: AddSheetProps) {
  const { enqueueFiles, saveText } = useUploads();
  const toast = useToast();
  const filesRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  async function pasteFromClipboard() {
    onClose();
    if (!navigator.clipboard?.read) {
      toast.show("This browser can't read the clipboard from a button. Use the paste box in your library.", "error");
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      let text = "";
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await clipboardItem.getType(imageType);
          files.push(new File([blob], `pasted-image.${imageType.split("/")[1]}`, { type: imageType }));
          continue;
        }
        if (!text && clipboardItem.types.includes("text/plain")) {
          text = await (await clipboardItem.getType("text/plain")).text();
        }
      }
      if (files.length > 0) enqueueFiles(files);
      else if (text.trim()) await saveText(text);
      else toast.show("The clipboard is empty. Copy an image or link first.", "error");
    } catch {
      toast.show("QuickDrop wasn't allowed to read the clipboard. Use the paste box in your library.", "error");
    }
  }

  const rows: Array<{ id: string; icon: IconName; label: string; hint: string; tint: string; onSelect: () => void }> = [
    {
      id: "files",
      icon: "upload",
      label: "Upload files",
      hint: "Photos, videos, documents",
      tint: KIND_GRADIENT_CLASSES.image,
      onSelect: () => {
        onClose();
        filesRef.current?.click();
      },
    },
    {
      id: "camera",
      icon: "image",
      label: "Take a photo or video",
      hint: "Opens the camera",
      tint: KIND_GRADIENT_CLASSES.video,
      onSelect: () => {
        onClose();
        cameraRef.current?.click();
      },
    },
    {
      id: "paste",
      icon: "paste",
      label: "Paste from clipboard",
      hint: "Screenshot, image or link",
      tint: KIND_GRADIENT_CLASSES.document,
      onSelect: () => void pasteFromClipboard(),
    },
    {
      id: "link",
      icon: "link",
      label: "Save a link or note",
      hint: "No file storage used",
      tint: KIND_GRADIENT_CLASSES.link,
      onSelect: () => {
        onClose();
        setLinkOpen(true);
      },
    },
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Add to QuickDrop">
        <ul className="-mx-2 -mt-2 space-y-1">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={row.onSelect}
                className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-muted active:bg-surface-muted"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${row.tint}`}>
                  <Icon name={row.icon} className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-foreground">{row.label}</span>
                  <span className="block text-sm text-muted">{row.hint}</span>
                </span>
                <Icon name="chevronRight" className="size-4 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
      <FilePickerInput inputRef={filesRef} />
      <FilePickerInput inputRef={cameraRef} capture="environment" accept="image/*,video/*" />
      <AddItemDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </>
  );
}
