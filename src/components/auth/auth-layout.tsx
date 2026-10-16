import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { FileTypeIcon } from "@/components/library/file-type-icon";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { FileKind } from "@/lib/files/constants";

interface AuthLayoutProps {
  /** "recovery" is the forgot-password and reset-password pages: no sign-in/sign-up switch. */
  mode: "login" | "signup" | "recovery";
  title: string;
  subtitle: string;
  children: ReactNode;
}

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "lock", title: "Private by default", text: "Files open only while you're signed in." },
  { icon: "compress", title: "Smaller uploads", text: "Images shrink in your browser first." },
  { icon: "paste", title: "Paste anywhere", text: "Screenshots, files and links in one go." },
];

// Decorative sample cards for the showcase panel.
const SAMPLE: Array<{ kind: FileKind; name: string; meta: string }> = [
  { kind: "image", name: "Checkout bug.png", meta: "412 KB · 2 min ago" },
  { kind: "video", name: "Login flow.mp4", meta: "18.2 MB · 1 hour ago" },
  { kind: "document", name: "QA test plan.pdf", meta: "1.3 MB · Yesterday" },
];

/** "Sign in | Create account" switch above the form. */
function ModeSwitch({ mode }: { mode: AuthLayoutProps["mode"] }) {
  const tabs = [
    { mode: "login" as const, href: "/login", label: "Sign in" },
    { mode: "signup" as const, href: "/signup", label: "Create account" },
  ];
  return (
    <nav aria-label="Account" className="flex rounded-full bg-surface-muted p-1">
      {tabs.map((tab) => {
        const active = tab.mode === mode;
        return (
          <Link
            key={tab.mode}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-full py-2 text-center text-[13px] font-semibold transition-colors",
              active ? "bg-surface text-foreground shadow-soft" : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Dark showcase panel for large screens. Decorative sample content only. */
function Showcase() {
  return (
    <div
      aria-hidden="true"
      className="relative m-3 hidden flex-col justify-between overflow-hidden rounded-[1.5rem] bg-primary p-10 text-primary-foreground lg:flex xl:p-12"
    >
      {/* Soft light behind the cards. */}
      <div className="pointer-events-none absolute -right-24 top-1/3 size-[28rem] rounded-full bg-primary-foreground/10 blur-3xl" />

      <div className="relative flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
          <span className="size-2 rounded-full bg-live motion-safe:animate-pulse" />
          Your files, everywhere
        </span>
      </div>

      <div className="relative flex flex-col gap-10">
        <h2 className="max-w-md text-[40px] font-bold leading-[44px] tracking-[-0.03em] xl:text-[44px] xl:leading-[48px]">
          Upload once. Grab it on any device.
        </h2>

        {/* Stack of sample cards */}
        <div className="relative h-48 max-w-sm">
          {SAMPLE.map((card, index) => (
            <div
              key={card.name}
              className="absolute inset-x-0 flex items-center gap-3 rounded-card bg-surface p-3.5 text-foreground shadow-float"
              style={{
                top: `${index * 3.6}rem`,
                left: `${index * 1.25}rem`,
                right: `${-index * 1.25}rem`,
                transform: `rotate(${index === 1 ? -1.5 : index === 2 ? 1.5 : 0}deg)`,
              }}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-container">
                <FileTypeIcon kind={card.kind} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-item">{card.name}</span>
                <span className="block text-caption text-muted">{card.meta}</span>
              </span>
              <Icon name="download" className="size-[18px] text-muted" />
            </div>
          ))}
        </div>
      </div>

      <ul className="relative grid grid-cols-3 gap-4">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex flex-col gap-1.5">
            <Icon name={feature.icon} className="size-5 text-live" />
            <span className="text-item">{feature.title}</span>
            <span className="text-caption text-primary-foreground/65">{feature.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Shared frame for sign-in and sign-up. Phones: a clean full-screen form with feature chips
 * underneath. Large screens: the form on the left and a dark showcase panel on the right.
 */
export function AuthLayout({ mode, title, subtitle, children }: AuthLayoutProps) {
  const other =
    mode === "login"
      ? { text: "New to QuickDrop?", label: "Create an account", href: "/signup" }
      : mode === "recovery"
        ? { text: "Remembered it?", label: "Back to sign in", href: "/login" }
        : { text: "Already have an account?", label: "Sign in", href: "/login" };

  return (
    <main className="grid min-h-dvh flex-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-10 lg:px-14 xl:px-20">
        <header className="flex items-center justify-between gap-3">
          <Link href="/login" aria-label="QuickDrop" className="rounded-lg">
            <Logo />
          </Link>
          <Link
            href={other.href}
            className="hidden rounded-full bg-surface-container px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-highest sm:inline-flex"
          >
            {other.label}
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center py-10">
          {mode === "recovery" ? null : <ModeSwitch mode={mode} />}

          <section aria-labelledby="auth-title" className="mt-8">
            <h1 id="auth-title" className="text-[30px] font-bold leading-[36px] tracking-[-0.025em] text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-body text-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </section>

          <p className="mt-6 text-center text-body text-muted">
            {other.text}{" "}
            <Link href={other.href} className="font-semibold text-foreground underline-offset-4 hover:underline">
              {other.label}
            </Link>
          </p>

          {/* Phones and tablets: the showcase's promises as small chips. */}
          <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:hidden">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-caption text-muted">
                <Icon name={feature.icon} className="size-3.5 text-foreground" />
                {feature.title}
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-caption text-subtle lg:justify-start">
          <Icon name="lock" className="size-3.5" />
          Private, signed uploads. Files open only for you.
        </p>
      </div>

      <Showcase />
    </main>
  );
}
