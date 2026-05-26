export interface ResetPasswordParams {
  name: string;
  resetUrl: string;
}

export function renderResetPasswordEmail(params: ResetPasswordParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, resetUrl } = params;
  const subject = 'Reset your NookApp password';

  const html = `<!doctype html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Reset your NookApp password 🔑</h1>
  <p>Hi ${escapeHtml(name)},</p>
  <p>Tap the button below to set a new password. The link expires in 1 hour.</p>
  <p style="margin: 32px 0;">
    <a href="${escapeHtml(resetUrl)}"
       style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
      Reset my password
    </a>
  </p>
  <p style="color: #666; font-size: 13px;">
    Or paste this link in your browser:<br>
    <a href="${escapeHtml(resetUrl)}" style="color:#666;">${escapeHtml(resetUrl)}</a>
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    If you didn't request a password reset, you can safely ignore this email.
  </p>
</body>
</html>`;

  const text = [
    `Reset your NookApp password,`,
    ``,
    `Hi ${name},`,
    ``,
    `Open this link to set a new password (expires in 1 hour):`,
    resetUrl,
    ``,
    `If you didn't request a password reset, you can safely ignore this email.`,
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
