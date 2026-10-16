import { extendTailwindMerge } from "tailwind-merge";

// Knows this project's custom theme scales, so for example "rounded-card" and "rounded-full"
// are recognised as conflicting and the later one wins.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["card", "control", "sheet"],
      shadow: ["soft", "card", "raised", "float"],
      // Custom type scale; without this "text-caption" would be mistaken for a colour.
      text: ["caption", "item", "body", "title", "headline"],
    },
  },
});

/** Joins class names, skipping falsy values. When classes conflict, the later one wins. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return merge(classes.filter(Boolean).join(" "));
}
