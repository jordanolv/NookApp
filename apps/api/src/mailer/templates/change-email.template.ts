export interface ChangeEmailParams {
  name: string;
  newEmail: string;
  confirmUrl: string;
}

export function renderChangeEmail(params: ChangeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, newEmail, confirmUrl } = params;
  const subject = 'Confirm your NookApp email change';

  const html = `<!doctype html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Email change requested</h1>
  <p>Hi ${escapeHtml(name)},</p>
  <p>You asked to change your NookApp email to <strong>${escapeHtml(newEmail)}</strong>. Confirm it below.</p>
  <p style="margin: 32px 0;">
    <a href="${escapeHtml(confirmUrl)}"
       style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
      Confirm email change
    </a>
  </p>
  <p style="color: #666; font-size: 13px;">
    Or paste this link in your browser:<br>
    <a href="${escapeHtml(confirmUrl)}" style="color:#666;">${escapeHtml(confirmUrl)}</a>
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    If you didn't request this, ignore this email and your address stays unchanged.
  </p>
</body>
</html>`;

  const text = [
    `Email change requested`,
    ``,
    `Hi ${name},`,
    ``,
    `Confirm changing your NookApp email to ${newEmail} by opening this link:`,
    confirmUrl,
    ``,
    `If you didn't request this, ignore this email.`,
  ].join('\n');

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
