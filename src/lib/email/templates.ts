// Client-safe. HTML and plain-text versions of each email. The HTML uses table layout and inline
// styles (with a small dark-mode block), which is what mail apps such as Gmail and Outlook support.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLORS = {
  page: "#f3f3f4",
  card: "#ffffff",
  border: "#e8e8e8",
  ink: "#1a1c1c",
  muted: "#4c4546",
  subtle: "#7e7576",
  chip: "#f3f3f4",
  button: "#000000",
  buttonText: "#ffffff",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

/** Hidden preview text that mail apps show next to the subject line. */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(text)}</div>`;
}

const DARK_MODE_CSS = `
  :root { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) {
    .qd-page { background: #101111 !important; }
    .qd-card { background: #18191a !important; border-color: #2a2b2c !important; }
    .qd-ink { color: #eef0f0 !important; }
    .qd-muted { color: #c8c0c1 !important; }
    .qd-subtle { color: #968d8e !important; }
    .qd-chip { background: #252627 !important; color: #c8c0c1 !important; }
    .qd-box { background: #252627 !important; color: #c8c0c1 !important; }
    .qd-button { background: #ffffff !important; color: #000000 !important; }
    .qd-brand { background: #ffffff !important; color: #000000 !important; }
  }
`;

/** Shared frame: brand row, eyebrow, title, body, footer. */
function layout({
  preview,
  eyebrow,
  title,
  body,
}: {
  preview: string;
  eyebrow: string;
  title: string;
  body: string;
}): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>
<style>${DARK_MODE_CSS}</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:${FONT};color:${COLORS.ink};-webkit-font-smoothing:antialiased">
${preheader(preview)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="qd-page" style="background:${COLORS.page};padding:40px 16px">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="qd-card" style="max-width:480px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:20px">
        <tr>
          <td style="padding:32px 36px 0 36px">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td class="qd-brand" width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;background:${COLORS.button};color:${COLORS.buttonText};border-radius:10px;font-size:16px;font-weight:700;line-height:32px">Q</td>
                <td style="padding-left:10px;font-size:16px;font-weight:700;letter-spacing:-0.01em" class="qd-ink">QuickDrop</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 0 36px">
            <p class="qd-subtle" style="margin:0 0 10px 0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.subtle}">${escapeHtml(eyebrow)}</p>
            <h1 class="qd-ink" style="margin:0;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.02em;color:${COLORS.ink}">${escapeHtml(title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 36px 36px">
            ${body}
          </td>
        </tr>
      </table>
      <p class="qd-subtle" style="margin:20px 0 0 0;font-size:12px;line-height:18px;color:${COLORS.subtle};text-align:center">
        &copy; ${year} QuickDrop &middot; Your personal space for files between devices
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function paragraph(html: string): string {
  return `<p class="qd-muted" style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:${COLORS.muted}">${html}</p>`;
}

function chip(label: string): string {
  return `<span class="qd-chip" style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;background:${COLORS.chip};font-size:12px;font-weight:600;color:${COLORS.muted}">${label}</span>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px 0">
  <tr>
    <td class="qd-button" style="border-radius:999px;background:${COLORS.button}">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${COLORS.buttonText};text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function fallbackLink(url: string): string {
  return `<p class="qd-subtle" style="margin:0 0 6px 0;font-size:12px;line-height:18px;color:${COLORS.subtle}">Button not working? Copy this link into your browser:</p>
<p class="qd-box" style="margin:0 0 24px 0;padding:12px 14px;border-radius:12px;background:${COLORS.chip};font-size:12px;line-height:18px;word-break:break-all;color:${COLORS.muted}">${escapeHtml(url)}</p>`;
}

function divider(): string {
  return `<div style="height:1px;background:${COLORS.border};margin:0 0 20px 0"></div>`;
}

function note(html: string): string {
  return `<p class="qd-subtle" style="margin:0;font-size:13px;line-height:20px;color:${COLORS.subtle}">${html}</p>`;
}

export function passwordResetEmail({ name, url }: { name: string; url: string }): EmailContent {
  const hello = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const html = layout({
    preview: "Reset your QuickDrop password. This link expires in 1 hour.",
    eyebrow: "Password reset",
    title: "Reset your password",
    body: [
      paragraph(hello),
      paragraph("We received a request to reset the password for your QuickDrop account. Choose a new password with the button below."),
      `<div style="margin:0 0 4px 0">${chip("Expires in 1 hour")}${chip("Works once")}</div>`,
      button("Reset password", url),
      fallbackLink(url),
      divider(),
      note("Didn&rsquo;t ask for this? You can ignore this email. Your password won&rsquo;t change."),
    ].join("\n"),
  });

  return {
    subject: "Reset your QuickDrop password",
    text: `${name ? `Hi ${name},` : "Hi,"}

We received a request to reset your QuickDrop password.

Choose a new password here (the link works once and expires in 1 hour):
${url}

Didn't ask for this? Ignore this email. Your password won't change.

QuickDrop`,
    html,
  };
}

export function passwordChangedEmail({ name }: { name: string }): EmailContent {
  const hello = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const html = layout({
    preview: "Your QuickDrop password was changed.",
    eyebrow: "Security notice",
    title: "Your password was changed",
    body: [
      paragraph(hello),
      paragraph("Your QuickDrop password was just changed. All other signed-in devices have been signed out."),
      divider(),
      note("If this wasn&rsquo;t you, reset your password right away from the sign-in page."),
    ].join("\n"),
  });

  return {
    subject: "Your QuickDrop password was changed",
    text: `${name ? `Hi ${name},` : "Hi,"}

Your QuickDrop password was just changed. All other signed-in devices have been signed out.

If this wasn't you, reset your password right away from the sign-in page.

QuickDrop`,
    html,
  };
}
