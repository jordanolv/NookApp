export interface AlreadyRegisteredParams {
  name: string;
  loginUrl: string;
  resetUrl: string;
}

export function renderAlreadyRegisteredEmail(params: AlreadyRegisteredParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, loginUrl, resetUrl } = params;
  const subject = 'You already have a NookApp account';

  const html = `<!doctype html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">You already have an account 🌿</h1>
  <p>Hi ${escapeHtml(name)},</p>
  <p>Someone (probably you) just tried to sign up with this email — but it already has a NookApp account. No new account was created.</p>
  <p style="margin: 32px 0;">
    <a href="${escapeHtml(loginUrl)}"
       style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
      Log in to NookApp
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">
    Forgot your password? <a href="${escapeHtml(resetUrl)}" style="color:#1a1a1a;">Reset it here</a>.
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    If you didn't try to sign up, you can safely ignore this email — your account is untouched.
  </p>
</body>
</html>`;

  const text = [
    `You already have a NookApp account`,
    ``,
    `Hi ${name},`,
    ``,
    `Someone (probably you) just tried to sign up with this email, but it already has`,
    `a NookApp account. No new account was created.`,
    ``,
    `Log in: ${loginUrl}`,
    `Forgot your password? Reset it: ${resetUrl}`,
    ``,
    `If you didn't try to sign up, you can safely ignore this email.`,
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
