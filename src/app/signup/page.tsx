import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create account",
};

// Needs the real session check to redirect signed-in users, so block on the server.
export const instant = false;

export default async function SignUpPage() {
  if (await getCurrentSession()) {
    redirect("/");
  }

  return (
    <AuthLayout mode="signup" title="Create your QuickDrop" subtitle="A private shelf for screenshots, files and links, on every device.">
      <SignUpForm />
    </AuthLayout>
  );
}
