import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
};

// Needs the real session check to redirect signed-in users, so block on the server.
export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  // The proxy only checks that a cookie exists. Confirm the session is real.
  if (await getCurrentSession()) {
    redirect("/");
  }

  const params = await searchParams;
  const passwordReset = params.reset === "1";

  return (
    <AuthLayout mode="login" title="Welcome back" subtitle="Sign in to get to your files on this device.">
      {passwordReset ? (
        <p role="status" className="mb-5 rounded-control bg-success-soft px-4 py-3 text-body text-success">
          Your password is updated. Sign in with your new password.
        </p>
      ) : null}
      <LoginForm />
    </AuthLayout>
  );
}
