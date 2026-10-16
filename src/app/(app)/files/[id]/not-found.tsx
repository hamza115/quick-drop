import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function ItemNotFound() {
  return (
    <section
      aria-labelledby="item-missing-title"
      className="mx-5 my-10 max-w-lg rounded-card bg-surface px-6 py-12 text-center shadow-card sm:mx-auto"
    >
      <h1 id="item-missing-title" className="text-lg font-semibold text-foreground">
        This item isn&apos;t here
      </h1>
      <p className="mt-2 text-sm text-muted">It may have been deleted, or the link is wrong.</p>
      <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-6" })}>
        Back to library
      </Link>
    </section>
  );
}
