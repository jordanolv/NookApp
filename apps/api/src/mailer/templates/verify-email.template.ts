export interface VerifyEmailParams {
  name: string;
  verifyUrl: string;
}

export function renderVerifyEmail(params: VerifyEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, verifyUrl } = params;
  const subject = 'Verify your NookApp account';

  const html = `<!doctype html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Welcome to NookApp 🌿</h1>
  <p>Hi ${escapeHtml(name)},</p>
  <p>Tap the button below to confirm your email and activate your account.</p>
  <p style="margin: 32px 0;">
    <a href="${escapeHtml(verifyUrl)}"
       style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
      Verify my email
    </a>
  </p>
  <p style="color: #666; font-size: 13px;">
    Or paste this link in your browser:<br>
    <a href="${escapeHtml(verifyUrl)}" style="color:#666;">${escapeHtml(verifyUrl)}</a>
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    If you didn't create an account, you can safely ignore this email.
  </p>
</body>
</html>`;

  const text = [
    `Welcome to NookApp,`,
    ``,
    `Hi ${name},`,
    ``,
    `Confirm your email by opening this link:`,
    verifyUrl,
    ``,
    `If you didn't create an account, you can safely ignore this email.`,
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
