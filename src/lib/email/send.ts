import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";
import type { EmailContent } from "@/lib/email/templates";

// Socket timeouts so a slow mail server can't keep a request open for long.
const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    const env = getEnv();
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // Port 465 uses SSL from the start. Other ports (such as 587) upgrade with STARTTLS.
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

function senderAddress(): string {
  const env = getEnv();
  return env.EMAIL_FROM ?? `QuickDrop <${env.SMTP_USER}>`;
}

/**
 * Sends one email over SMTP. Without SMTP_USER and SMTP_PASS, development prints the email to the
 * terminal (so reset links can be tried locally). Production refuses to pretend it sent anything.
 */
export async function sendEmail(to: string, content: EmailContent): Promise<void> {
  if (!isEmailConfigured()) {
    if (getEnv().NODE_ENV === "production") throw new Error("Email is not configured.");
    console.info(`[email:dev] to=${to} subject="${content.subject}"\n${content.text}\n`);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: senderAddress(),
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (error) {
    // Log the error type only. Mail server messages can echo the account name.
    console.error("[email] send failed:", error instanceof Error ? error.name : "unknown error");
    throw new Error("Email could not be sent. Try again in a moment.");
  }
}
