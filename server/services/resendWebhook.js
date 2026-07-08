import crypto from 'crypto';

const SIGNATURE_TOLERANCE_SEC = 5 * 60;

function decodeSecret(secret) {
  if (typeof secret !== 'string') return null;
  const stripped = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  try {
    return Buffer.from(stripped, 'base64');
  } catch {
    return null;
  }
}

function safeEqual(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signPayload({ id, timestamp, body, secret }) {
  const key = decodeSecret(secret);
  if (!key) throw new Error('Invalid secret');
  const signed = `${id}.${timestamp}.${body}`;
  return crypto.createHmac('sha256', key).update(signed).digest('base64');
}

export function verifyResendSignature({ headers, rawBody, secret, now = Date.now() }) {
  if (!headers || !rawBody || !secret) return false;
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const sigHeader = headers['svix-signature'];
  if (!id || !timestamp || !sigHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(now / 1000 - ts);
  if (ageSec > SIGNATURE_TOLERANCE_SEC) return false;

  const key = decodeSecret(secret);
  if (!key) return false;

  const signed = `${id}.${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', key).update(signed).digest();

  return sigHeader.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    let provided;
    try {
      provided = Buffer.from(value, 'base64');
    } catch {
      return false;
    }
    return safeEqual(expected, provided);
  });
}

// Note: email.delivery_delayed is intentionally NOT here — a delay is not
// a bounce and Resend will still retry. Suppressing on delay would
// permanently disable accounts whose MX is just slow.
const BOUNCE_TYPES = new Set(['email.bounced', 'email.bounce']);
const COMPLAINT_TYPES = new Set(['email.complained', 'email.complaint']);

export function classifyEvent(event) {
  if (!event || typeof event.type !== 'string') return { kind: 'ignore' };
  if (BOUNCE_TYPES.has(event.type)) {
    // Resend classifies bounces as Permanent (hard), Transient (soft), or
    // Undetermined. Only hard bounces should suppress — Resend retries the
    // others, so suppressing them would permanently disable a live address (f14).
    // A bounce with no type falls back to suppress (don't miss a real hard bounce).
    const bounceType = event.data?.bounce?.type;
    const kind = (bounceType === 'Transient' || bounceType === 'Undetermined')
      ? 'soft-bounce'
      : 'bounce';
    return { kind, email: extractEmail(event) };
  }
  if (COMPLAINT_TYPES.has(event.type)) {
    return { kind: 'complaint', email: extractEmail(event) };
  }
  return { kind: 'ignore' };
}

function extractEmail(event) {
  const to = event?.data?.to;
  if (Array.isArray(to)) return to[0] || null;
  if (typeof to === 'string') return to;
  return event?.data?.email || null;
}
