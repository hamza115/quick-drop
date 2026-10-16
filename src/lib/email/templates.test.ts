import { describe, expect, it } from "vitest";
import { escapeHtml, passwordChangedEmail, passwordResetEmail } from "@/lib/email/templates";

const url = "https://quickdrop.example.com/api/auth/reset-password/abc123?callbackURL=x";

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });
});

describe("passwordResetEmail", () => {
  it("includes the reset link in both the HTML and text versions", () => {
    const email = passwordResetEmail({ name: "Ada", url });
    expect(email.html).toContain("https://quickdrop.example.com/api/auth/reset-password/abc123?callbackURL=x".replace(/&/g, "&amp;"));
    expect(email.text).toContain(url);
    expect(email.subject).toBe("Reset your QuickDrop password");
  });

  it("escapes a malicious display name in the HTML", () => {
    const email = passwordResetEmail({ name: `<img src=x onerror="alert(1)">`, url });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });

  it("works without a name", () => {
    const email = passwordResetEmail({ name: "", url });
    expect(email.text.startsWith("Hi,")).toBe(true);
  });
});

describe("passwordChangedEmail", () => {
  it("tells the user the password changed and what to do if it wasn't them", () => {
    const email = passwordChangedEmail({ name: "Ada" });
    expect(email.subject).toBe("Your QuickDrop password was changed");
    expect(email.text).toContain("reset your password right away");
    expect(email.html).toContain("Your password was changed");
  });
});
