"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { TextField } from "@/components/ui/text-field";

export function ForgotPasswordForm() {
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({
      email: new FormData(event.currentTarget).get("email"),
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      setFormError(null);
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: parsed.data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setSubmitting(false);
        setFormError(
          error.status === 429
            ? "Too many requests. Wait a minute, then try again."
            : "We couldn't send the email. Try again in a moment.",
        );
        return;
      }
      setSubmitting(false);
      setSentTo(parsed.data.email);
    } catch {
      setSubmitting(false);
      setFormError("Couldn't reach QuickDrop. Check your connection and try again.");
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <div role="status" className="flex items-start gap-3 rounded-control bg-success-soft px-4 py-3.5 text-body text-success">
          <Icon name="mail" className="mt-0.5 size-5 shrink-0" />
          <p>
            If an account exists for <strong className="font-semibold">{sentTo}</strong>, we&apos;ve sent a link to
            reset your password. The link expires in 1 hour.
          </p>
        </div>
        <p className="text-caption text-muted">
          Nothing in your inbox? Check your spam folder, or try a different email address.
        </p>
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </div>
    );
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
        error={fieldError}
        disabled={submitting}
      />

      {formError ? (
        <div role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-caption text-danger">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-1 w-full" loading={submitting}>
        {submitting ? "Sending link…" : "Send reset link"}
        {submitting ? null : <Icon name="arrowRight" className="size-[18px]" />}
      </Button>

      <Link href="/login" className="self-center text-caption font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
