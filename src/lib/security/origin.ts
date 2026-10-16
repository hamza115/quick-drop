// Pure helper, no server-only imports, so it can be unit tested.

/**
 * Decides whether a state-changing request comes from this app's own pages.
 * Browsers send Origin on every cross-origin POST, PATCH and DELETE, and on same-origin ones from fetch.
 * When Origin is missing, Sec-Fetch-Site is used; when both are missing the caller is not a browser
 * page, and cookie-based CSRF does not apply.
 */
export function isSameOriginRequest(
  headers: { get(name: string): string | null },
  allowedOrigins: readonly string[],
): boolean {
  const origin = headers.get("origin");
  if (origin) {
    if (origin === "null") return false;
    return allowedOrigins.includes(origin.toLowerCase());
  }
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  return true;
}

/** Normalises an origin, for example "https://App.example.com/" → "https://app.example.com". */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin.toLowerCase();
  } catch {
    return null;
  }
}
