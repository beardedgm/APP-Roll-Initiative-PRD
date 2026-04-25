import { describe, it, expect } from 'vitest';
import {
  verifyResendSignature,
  signPayload,
  classifyEvent,
} from '../../services/resendWebhook.js';

const SECRET = 'whsec_dGVzdC1zZWNyZXQ='; // "test-secret" base64
const ID = 'msg_2abc';
const NOW = 1_710_000_000_000; // fixed clock — milliseconds
const TIMESTAMP_SEC = String(Math.floor(NOW / 1000));
const BODY = JSON.stringify({ type: 'email.bounced', data: { to: ['x@y.co'] } });
const RAW = Buffer.from(BODY, 'utf8');

function signed(extraOpts = {}) {
  const sig = signPayload({ id: ID, timestamp: TIMESTAMP_SEC, body: BODY, secret: SECRET });
  return {
    headers: {
      'svix-id': ID,
      'svix-timestamp': TIMESTAMP_SEC,
      'svix-signature': `v1,${sig}`,
    },
    rawBody: RAW,
    secret: SECRET,
    now: NOW,
    ...extraOpts,
  };
}

describe('verifyResendSignature', () => {
  it('returns true for a valid signature', () => {
    expect(verifyResendSignature(signed())).toBe(true);
  });

  it('returns false when body is tampered', () => {
    expect(verifyResendSignature({ ...signed(), rawBody: Buffer.from('{}', 'utf8') })).toBe(false);
  });

  it('returns false when timestamp is older than 5 minutes', () => {
    const stale = String(Math.floor(NOW / 1000) - 6 * 60);
    const sig = signPayload({ id: ID, timestamp: stale, body: BODY, secret: SECRET });
    expect(verifyResendSignature({
      headers: { 'svix-id': ID, 'svix-timestamp': stale, 'svix-signature': `v1,${sig}` },
      rawBody: RAW,
      secret: SECRET,
      now: NOW,
    })).toBe(false);
  });

  it('returns false when timestamp is in the far future', () => {
    const future = String(Math.floor(NOW / 1000) + 10 * 60);
    const sig = signPayload({ id: ID, timestamp: future, body: BODY, secret: SECRET });
    expect(verifyResendSignature({
      headers: { 'svix-id': ID, 'svix-timestamp': future, 'svix-signature': `v1,${sig}` },
      rawBody: RAW,
      secret: SECRET,
      now: NOW,
    })).toBe(false);
  });

  it('returns false when any required header is missing', () => {
    const opts = signed();
    delete opts.headers['svix-id'];
    expect(verifyResendSignature(opts)).toBe(false);
  });

  it('returns false when the secret is wrong', () => {
    expect(verifyResendSignature({ ...signed(), secret: 'whsec_d3JvbmctMQ==' })).toBe(false);
  });

  it('matches when the signature header carries multiple v1 entries', () => {
    const sig = signPayload({ id: ID, timestamp: TIMESTAMP_SEC, body: BODY, secret: SECRET });
    const opts = signed();
    opts.headers['svix-signature'] = `v1,not-the-right-sig v1,${sig}`;
    expect(verifyResendSignature(opts)).toBe(true);
  });

  it('rejects when none of the entries are v1', () => {
    const opts = signed();
    opts.headers['svix-signature'] = 'v2,abc';
    expect(verifyResendSignature(opts)).toBe(false);
  });
});

describe('classifyEvent', () => {
  it('classifies bounces', () => {
    expect(classifyEvent({ type: 'email.bounced', data: { to: ['a@b.co'] } })).toEqual({
      kind: 'bounce',
      email: 'a@b.co',
    });
  });

  it('classifies complaints', () => {
    expect(classifyEvent({ type: 'email.complained', data: { to: ['c@d.co'] } })).toEqual({
      kind: 'complaint',
      email: 'c@d.co',
    });
  });

  it('returns ignore for unrelated event types', () => {
    expect(classifyEvent({ type: 'email.delivered', data: { to: ['x@y.co'] } })).toEqual({ kind: 'ignore' });
  });

  it('handles a string-valued to field', () => {
    expect(classifyEvent({ type: 'email.bounced', data: { to: 'a@b.co' } })).toEqual({
      kind: 'bounce',
      email: 'a@b.co',
    });
  });

  it('returns ignore for malformed events', () => {
    expect(classifyEvent(null)).toEqual({ kind: 'ignore' });
    expect(classifyEvent({})).toEqual({ kind: 'ignore' });
  });
});
