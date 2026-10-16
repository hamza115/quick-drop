"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { loginSchema } from "@/lib/validation/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { TextField } from "@/components/ui/text-field";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "email" || key === "password") && !next[key]) {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const { error } = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setSubmitting(false);
        setFormError(
          error.status === 429
            ? "Too many sign-in attempts. Wait a minute, then try again."
            : "That email and password don't match. Check them and try again.",
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setSubmitting(false);
      setFormError("Couldn't reach QuickDrop. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        name="email"
        type="email"
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        autoFocus
        error={fieldErrors.email}
        disabled={submitting}
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        icon="lock"
        placeholder="Your password"
        autoComplete="current-password"
        error={fieldErrors.password}
        disabled={submitting}
      />

      <div className="-mt-2 flex justify-end">
        <Link href="/forgot-password" className="text-caption font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline">
          Forgot password?
        </Link>
      </div>

      {formError ? (
        <div role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-caption text-danger">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-1 w-full" loading={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
        {submitting ? null : <Icon name="arrowRight" className="size-[18px]" />}
      </Button>
    </form>
  );
}
