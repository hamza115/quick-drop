import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section aria-labelledby="not-found-title" className="max-w-md text-center">
        <h1 id="not-found-title" className="text-lg font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted">This address doesn&apos;t match anything in QuickDrop.</p>
        <Link href="/" className={buttonClasses({ className: "mt-6" })}>
          Go to your library
        </Link>
      </section>
    </main>
  );
}
