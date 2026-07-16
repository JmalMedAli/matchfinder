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

export function buildNotificationEmail(title: string, message: string, actionUrl?: string): string {
  const url = actionUrl ? `https://${process.env.NEXT_PUBLIC_SITE_URL || "matchfinder.app"}${actionUrl}` : "";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; font-size: 24px; margin: 0;">MatchFinder</h1>
      </div>
      <div style="padding: 0 8px;">
        <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 8px;">${title}</h2>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">${message}</p>
        ${url ? `
          <a href="${url}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View Match
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
