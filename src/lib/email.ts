import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOpts): Promise<boolean> {
  if (!resend) return false;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "MatchFinder <notifications@matchfinder.app>",
      to,
      subject,
      html,
    });
    return true;
  } catch {
    return false;
  }
}

/** Escapes HTML-significant characters so untrusted title/message text can't inject markup into the email. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds an absolute site URL regardless of whether NEXT_PUBLIC_SITE_URL includes a protocol. */
function buildSiteUrl(path: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "matchfinder.app";
  const base = /^https?:\/\//i.test(site) ? site : `https://${site}`;
  return new URL(path, base).toString();
}

export function buildNotificationEmail(title: string, message: string, actionUrl?: string): string {
  const url = actionUrl ? buildSiteUrl(actionUrl) : "";
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; background: #f1f2ee;">
      <div style="background: #16a34a; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; font-size: 24px; margin: 0;">MatchFinder</h1>
      </div>
      <div style="background: white; border-radius: 16px; padding: 24px;">
        <h2 style="color: #0a0e14; font-size: 18px; margin: 0 0 8px;">${safeTitle}</h2>
        <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0;">${safeMessage}</p>
        ${url ? `
          <a href="${url}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View in MatchFinder
          </a>
        ` : ""}
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
        You received this because you have email notifications enabled.
      </p>
    </body>
    </html>
  `;
}
