import { cn } from "@/lib/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Hide the word and show only the mark. */
  markOnly?: boolean;
}

const SIZES = {
  sm: { tile: "size-7 rounded-lg", icon: "size-4", text: "text-[17px] font-bold tracking-tight" },
  md: { tile: "size-8 rounded-lg", icon: "size-[1.125rem]", text: "text-title" },
  lg: { tile: "size-11 rounded-xl", icon: "size-6", text: "text-[28px] font-bold tracking-tight" },
} as const;

/** QuickDrop mark (black tile with a cloud and arrow) and wordmark. */
export function Logo({ size = "md", className, markOnly = false }: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <span className={cn("grid shrink-0 place-items-center bg-primary text-primary-foreground", s.tile)}>
        <svg
          aria-hidden="true"
          className={s.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 18a5 5 0 1 1 1.2-9.86A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z" />
          <path d="M12 10.5v5" />
          <path d="m9.75 13.5 2.25 2.25 2.25-2.25" />
        </svg>
      </span>
      {markOnly ? <span className="sr-only">QuickDrop</span> : <span className={s.text}>QuickDrop</span>}
    </span>
  );
}
