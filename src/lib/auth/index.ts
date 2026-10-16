import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb, getMongoClient } from "@/lib/db/mongodb";
import { getEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail, passwordResetEmail } from "@/lib/email/templates";

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const ONE_DAY = 60 * 60 * 24;
const ONE_HOUR = 60 * 60;

const env = getEnv();

export const auth = betterAuth({
  appName: "QuickDrop",
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: mongodbAdapter(getDb(), { client: getMongoClient() }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
    // Reset links work once and expire after an hour.
    resetPasswordTokenExpiresIn: ONE_HOUR,
    // Changing the password signs out every other session.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, passwordResetEmail({ name: user.name, url }));
    },
    onPasswordReset: async ({ user }) => {
      // A notice that the password changed. Failing to send it must not undo the reset.
      await sendEmail(user.email, passwordChangedEmail({ name: user.name })).catch(() => undefined);
    },
  },
  session: {
    expiresIn: SEVEN_DAYS,
    updateAge: ONE_DAY,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  // Keep last so Set-Cookie works inside Server Actions and Server Components.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
