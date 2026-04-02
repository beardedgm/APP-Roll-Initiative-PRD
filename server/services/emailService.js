import resend from '../config/resend.js';
import logger from '../config/logger.js';
import User from '../models/User.js';

const FROM = process.env.EMAIL_FROM || 'Initiative Tracker <noreply@example.com>';
const APP_NAME = process.env.APP_NAME || 'Initiative Tracker';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function wrap(title, body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#16213e;border-radius:8px;border:1px solid #333;overflow:hidden;">
    <div style="background:#0f3460;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#d4a843;font-size:24px;">&#9876; ${escapeHtml(APP_NAME)}</h1>
    </div>
    <div style="padding:32px;color:#e0e0e0;line-height:1.6;">
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #333;color:#888;font-size:12px;text-align:center;">
      ${escapeHtml(APP_NAME)} &mdash; Roll for Initiative!
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(email, displayName, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  const html = wrap('Verify Your Email', `
    <h2 style="color:#d4a843;margin-top:0;">Welcome, ${escapeHtml(displayName)}!</h2>
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
    <p>Hi ${escapeHtml(displayName)}, we received a request to reset your password:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;padding:12px 32px;background:#d4a843;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Reset Password
      </a>
    </div>
    <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `);

  return sendEmail(email, 'Reset your password', html);
}

export async function sendWelcomeEmail(email, displayName) {
  const html = wrap('Welcome to ' + APP_NAME, `
    <h2 style="color:#d4a843;margin-top:0;">Welcome aboard, ${escapeHtml(displayName)}!</h2>
    <p>Your account is ready. Start tracking initiative for your encounters right away.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}/tracker" style="display:inline-block;padding:12px 32px;background:#d4a843;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Open Tracker
      </a>
    </div>
    <p style="color:#888;font-size:13px;">May your rolls be ever in your favor.</p>
  `);

  return sendEmail(email, 'Welcome', html);
}

export async function sendPaymentReceiptEmail(email, displayName, amount, currency) {
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'usd' }).format((amount || 0) / 100);
  const html = wrap('Payment Receipt', `
    <h2 style="color:#d4a843;margin-top:0;">Payment Received</h2>
    <p>Hi ${escapeHtml(displayName)}, we received your payment of <strong>${formatted}</strong>.</p>
    <p>Your premium subscription is active. Thank you for supporting ${escapeHtml(APP_NAME)}!</p>
    <p style="color:#888;font-size:13px;">Questions? Reply to this email.</p>
  `);

  return sendEmail(email, 'Payment receipt', html);
}

export async function sendPaymentFailedEmail(email, displayName) {
  const html = wrap('Payment Failed', `
    <h2 style="color:#d4a843;margin-top:0;">Payment Issue</h2>
    <p>Hi ${escapeHtml(displayName)}, we were unable to process your subscription payment.</p>
    <p>Please update your payment method to keep your premium features active:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}/settings" style="display:inline-block;padding:12px 32px;background:#d4a843;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Update Payment
      </a>
    </div>
  `);

  return sendEmail(email, 'Payment failed', html);
}

export async function sendSubscriptionCancelledEmail(email, displayName) {
  const html = wrap('Subscription Cancelled', `
    <h2 style="color:#d4a843;margin-top:0;">Subscription Cancelled</h2>
    <p>Hi ${escapeHtml(displayName)}, your premium subscription has been cancelled.</p>
    <p>You can still use the free features of ${escapeHtml(APP_NAME)}. If you change your mind, you can resubscribe anytime.</p>
    <p style="color:#888;font-size:13px;">We hope to see you back at the table!</p>
  `);

  return sendEmail(email, 'Subscription cancelled', html);
}

async function sendEmail(to, subject, html) {
  if (!resend) {
    logger.warn({ to, subject }, 'Email skipped — Resend not configured');
    return null;
  }

  // Check bounce/suppress flags before sending
  const user = await User.findOne({ email: to.toLowerCase() }).select('emailBounced emailSuppressed');
  if (user?.emailBounced || user?.emailSuppressed) {
    logger.warn({ to, subject }, 'Email skipped — address is bounced or suppressed');
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
