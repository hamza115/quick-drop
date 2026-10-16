import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

/**
 * Optimistic redirect only: checks that a session cookie exists.
 * The real session check happens in the (app) layout and in every private
 * route handler, so a forged or expired cookie still gets nothing.
 * The login page checks the real session itself, which avoids a redirect
 * loop when a cookie is stale.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (!hasSessionCookie && !PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Static assets must load without a session: the FFmpeg worker and core (ffmpeg/), and the
  // install manifest and icons, which phones fetch from the sign-in page too.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|ffmpeg/|manifest.webmanifest|icon.svg|apple-icon).*)"],
};
