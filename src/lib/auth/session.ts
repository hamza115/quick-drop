import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Returns the current session, or null. Cached per request. */
export const getCurrentSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
