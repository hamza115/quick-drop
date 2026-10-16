import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { InvalidResetLink, ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
};

// Reads the reset token from the URL, so block on the server (see the layout).
export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  // Better Auth sends ?error=INVALID_TOKEN when the link is expired or already used.
  const invalid = token === "" || typeof params.error === "string";

  return (
    <AuthLayout
      mode="recovery"
      title="Choose a new password"
      subtitle="Pick a password you haven't used on QuickDrop before."
    >
      {invalid ? <InvalidResetLink /> : <ResetPasswordForm token={token} />}
    </AuthLayout>
  );
}
