import { z } from "zod";

/** Optional setting where a blank line in .env (for example "CLOUDINARY_API_KEY=") counts as unset. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}

function isLocalOrigin(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, "MONGODB_URI must start with mongodb:// or mongodb+srv://"),
    MONGODB_DB_NAME: z.string().min(1).default("quickdrop"),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    APP_URL: z.url({ protocol: /^https?$/, message: "APP_URL must be an http or https URL" }),
    // Cloudinary is optional at startup. Upload routes report it as not configured instead.
    CLOUDINARY_CLOUD_NAME: optional(z.string().min(1)),
    CLOUDINARY_API_KEY: optional(z.string().min(1)),
    CLOUDINARY_API_SECRET: optional(z.string().min(1)),
    // Optional per-account storage limit in MB. Without it, usage is shown without a quota bar.
    STORAGE_LIMIT_MB: optional(z.coerce.number().int().positive().max(1_000_000)),
    // Optional. Protects the scheduled cleanup route (Vercel sends it as a Bearer token).
    CRON_SECRET: optional(z.string().min(16, "CRON_SECRET must be at least 16 characters")),
    // Email over SMTP (nodemailer). Without SMTP_USER and SMTP_PASS, development prints emails instead.
    // Defaults target Gmail: use an app password for SMTP_PASS.
    SMTP_HOST: optional(z.string().min(1)).default("smtp.gmail.com"),
    SMTP_PORT: optional(z.coerce.number().int().positive().max(65535)).default(465),
    SMTP_USER: optional(z.string().min(1)),
    SMTP_PASS: optional(z.string().min(1)),
    // Optional "From" header. Defaults to QuickDrop <SMTP_USER>.
    EMAIL_FROM: optional(z.string().min(3)),
  })
  // https is required in production, except for a local production build (next build && next start).
  .refine((env) => env.NODE_ENV !== "production" || env.APP_URL.startsWith("https://") || isLocalOrigin(env.APP_URL), {
    message: "APP_URL must use https:// in production",
    path: ["APP_URL"],
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Validates raw environment variables. Throws with a readable list of problems. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`);
    throw new Error(`Invalid server configuration:\n${problems.join("\n")}`);
  }
  return result.data;
}

let cachedEnv: ServerEnv | undefined;

/** Server-only accessor. Validates once and caches the result. */
export function getEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
