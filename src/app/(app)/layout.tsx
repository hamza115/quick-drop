import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { SessionExpiredBanner } from "@/components/app/session-expired-banner";
import { GlobalDropPaste } from "@/components/uploads/global-drop-paste";
import { UploadPanel } from "@/components/uploads/upload-panel";
import { UploadProvider } from "@/components/uploads/upload-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentSession } from "@/lib/auth/session";
import { getStorageStatus } from "@/lib/files/repository";
import { SIDEBAR_COOKIE } from "@/lib/ui-prefs";

// Real authorization check. The proxy is only an optimistic redirect.
// Opted out of instant navigation so the session check blocks on the server
// and the redirect to /login is exact. See the Next.js auth-with-cache-components guide.
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const [storage, cookieStore] = await Promise.all([getStorageStatus(session.user.id), cookies()]);
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <ToastProvider>
      <UploadProvider>
        <AppShell
          userEmail={session.user.email}
          userName={session.user.name ?? ""}
          storage={storage}
          sidebarCollapsed={sidebarCollapsed}
        >
          {children}
        </AppShell>
        <GlobalDropPaste />
        <UploadPanel />
        <SessionExpiredBanner />
      </UploadProvider>
    </ToastProvider>
  );
}
