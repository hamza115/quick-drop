/** Fired on window when an API call reports that the session has ended. */
export const SESSION_EXPIRED_EVENT = "quickdrop:session-expired";

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable code from the server, for example "delete_partial". Empty for network errors. */
  readonly code: string;
  /**
   * Network errors, rate limits and server errors can succeed later, and so can an expired session
   * once the user signs in again. Other client errors cannot.
   */
  readonly retryable: boolean;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryable = status === 0 || status === 401 || status === 429 || status >= 500;
  }

  get sessionExpired(): boolean {
    return this.status === 401;
  }
}

/** Calls a QuickDrop API route and returns the parsed body, or throws an ApiError with a readable message. */
export async function apiRequest<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Couldn't reach QuickDrop. Check your connection and try again.", 0);
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!response.ok) {
    const details =
      typeof body === "object" && body !== null && "error" in body
        ? (body as { error: { message?: unknown; code?: unknown } }).error
        : null;
    const message = details ? String(details.message ?? "") : "";
    const code = details && typeof details.code === "string" ? details.code : "";
    throw new ApiError(message || "Something went wrong. Try again.", response.status, code);
  }
  return body as T;
}
