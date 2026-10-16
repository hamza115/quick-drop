"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { signUpSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { TextField } from "@/components/ui/text-field";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export function SignUpForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "name" || key === "email" || key === "password") && !next[key]) {
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
      const { error } = await authClient.signUp.email(parsed.data);

      if (error) {
        setSubmitting(false);
        // Generic on purpose: the message must not reveal whether an email is already registered.
        setFormError(
          error.status === 429
            ? "Too many attempts. Wait a minute, then try again."
            : "We couldn't create your account. Check your details, or sign in if you already have one.",
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
        name="name"
        label="Name"
        icon="user"
        placeholder="What should we call you?"
        autoComplete="name"
        autoFocus
        error={fieldErrors.name}
        disabled={submitting}
      />
      <TextField
        name="email"
        type="email"
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        error={fieldErrors.email}
        disabled={submitting}
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        icon="lock"
        placeholder="At least 12 characters"
        autoComplete="new-password"
        hint="Use 12 or more characters. A short sentence works well."
        error={fieldErrors.password}
        disabled={submitting}
      />

      {formError ? (
        <div role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-caption text-danger">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-1 w-full" loading={submitting}>
        {submitting ? "Creating account…" : "Create account"}
        {submitting ? null : <Icon name="arrowRight" className="size-[18px]" />}
      </Button>
    </form>
  );
}
