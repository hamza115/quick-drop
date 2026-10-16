import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Forgot password",
};

// Needs the real session check to redirect signed-in users, so block on the server.
export const instant = false;

export default async function ForgotPasswordPage() {
  if (await getCurrentSession()) {
    redirect("/");
  }

  return (
    <AuthLayout
      mode="recovery"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
