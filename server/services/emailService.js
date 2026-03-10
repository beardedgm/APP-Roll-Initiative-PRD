import resend from '../config/resend.js';
import logger from '../config/logger.js';

const FROM = process.env.EMAIL_FROM || 'Initiative Tracker <noreply@example.com>';
const APP_NAME = process.env.APP_NAME || 'Initiative Tracker';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function wrap(title, body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#16213e;border-radius:8px;border:1px solid #333;overflow:hidden;">
    <div style="background:#0f3460;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#d4a843;font-size:24px;">&#9876; ${APP_NAME}</h1>
    </div>
    <div style="padding:32px;color:#e0e0e0;line-height:1.6;">
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #333;color:#888;font-size:12px;text-align:center;">
      ${APP_NAME} &mdash; Roll for Initiative!
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(email, displayName, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  const html = wrap('Verify Your Email', `
    <h2 style="color:#d4a843;margin-top:0;">Welcome, ${displayName}!</h2>
    <p>Thanks for signing up. Please verify your email to activate your account:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;padding:12px 32px;background:#d4a843;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Verify Email
      </a>
    </div>
    <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't create an account, ignore this email.</p>
  `);

  return sendEmail(email, 'Verify your email', html);
}

export async function sendPasswordResetEmail(email, displayName, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  const html = wrap('Reset Your Password', `
    <h2 style="color:#d4a843;margin-top:0;">Password Reset</h2>
    <p>Hi ${displayName}, we received a request to reset your password:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;padding:12px 32px;background:#d4a843;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Reset Password
      </a>
    </div>
    <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `);

  return sendEmail(email, 'Reset your password', html);
}

async function sendEmail(to, subject, html) {
  if (!resend) {
    logger.warn({ to, subject }, 'Email skipped — Resend not configured');
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `${subject} — ${APP_NAME}`,
      html,
    });

    if (error) {
      logger.error({ error, to, subject }, 'Resend API error');
      return null;
    }

    logger.info({ to, subject, id: data?.id }, 'Email sent');
    return data;
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed');
    return null;
  }
}
