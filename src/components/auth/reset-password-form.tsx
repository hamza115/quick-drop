"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { Button, buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { TextField } from "@/components/ui/text-field";

type FieldErrors = Partial<Record<"password" | "confirm", string>>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ message: string; expired: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: String(form.get("password") ?? ""),
      confirm: String(form.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "password" || key === "confirm") && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: parsed.data.password, token });
      if (error) {
        setSubmitting(false);
        const expired = error.status === 400 || (error as { code?: string }).code === "INVALID_TOKEN";
        setFormError({
          expired,
          message: expired
            ? "This link has expired or was already used."
            : "We couldn't reset your password. Try again in a moment.",
        });
        return;
      }
      router.replace("/login?reset=1");
      router.refresh();
    } catch {
      setSubmitting(false);
      setFormError({ expired: false, message: "Couldn't reach QuickDrop. Check your connection and try again." });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        name="password"
        type="password"
        label="New password"
        icon="lock"
        placeholder="At least 12 characters"
        autoComplete="new-password"
        autoFocus
        hint="Use 12 or more characters. A short sentence works well."
        error={fieldErrors.password}
        disabled={submitting}
      />
      <TextField
        name="confirm"
        type="password"
        label="Confirm new password"
        icon="lock"
        placeholder="Type it again"
        autoComplete="new-password"
        error={fieldErrors.confirm}
        disabled={submitting}
      />

      {formError ? (
        <div role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-caption text-danger">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          <span>
            {formError.message}
            {formError.expired ? (
              <>
                {" "}
                <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
                  Request a new link
                </Link>
                .
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-1 w-full" loading={submitting}>
        {submitting ? "Saving…" : "Save new password"}
        {submitting ? null : <Icon name="arrowRight" className="size-[18px]" />}
      </Button>
    </form>
  );
}

/** Shown when the link is missing, expired or already used. */
export function InvalidResetLink() {
  return (
    <div className="flex flex-col gap-5">
      <div role="alert" className="flex items-start gap-3 rounded-control bg-danger-soft px-4 py-3.5 text-body text-danger">
        <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
        <p>This reset link is missing, has expired, or was already used.</p>
      </div>
      <Link href="/forgot-password" className={buttonClasses({ size: "lg", className: "w-full" })}>
        Request a new link
      </Link>
    </div>
  );
}
