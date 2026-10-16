"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Signs out and returns to the sign-in page. Errors are reported as toasts. */
export function useSignOut() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error("sign out failed");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.show("Couldn't sign out. Check your connection and try again.", "error");
      setPending(false);
    }
  }, [router, toast]);

  return { signOut, pending };
}

export function SignOutButton() {
  const { signOut, pending } = useSignOut();
  return (
    <Button variant="secondary" size="sm" onClick={signOut} loading={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
