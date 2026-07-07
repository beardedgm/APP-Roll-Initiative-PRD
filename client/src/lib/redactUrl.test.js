import { describe, it, expect } from 'vitest';
import { stripSensitiveParams, redactAnalyticsEvent } from './redactUrl';

describe('stripSensitiveParams', () => {
  it('removes a token query param from an absolute URL', () => {
    expect(stripSensitiveParams('https://app.com/reset-password?token=abc123'))
      .toBe('https://app.com/reset-password');
  });

  it('removes the token but keeps other params', () => {
    expect(stripSensitiveParams('https://app.com/verify-email?token=abc&ref=email'))
      .toBe('https://app.com/verify-email?ref=email');
  });

  it('handles relative URLs', () => {
    expect(stripSensitiveParams('/reset-password?token=abc')).toBe('/reset-password');
  });

  it('strips known token aliases', () => {
    expect(stripSensitiveParams('/x?access_token=a&reset_token=b&verify_token=c&keep=1'))
      .toBe('/x?keep=1');
  });

  it('is a no-op when there is no sensitive param', () => {
    expect(stripSensitiveParams('https://app.com/pricing?ref=x')).toBe('https://app.com/pricing?ref=x');
  });

  it('preserves the hash fragment', () => {
    expect(stripSensitiveParams('https://app.com/x?token=a#frag')).toBe('https://app.com/x#frag');
  });

  it('returns non-strings unchanged', () => {
    expect(stripSensitiveParams(null)).toBe(null);
    expect(stripSensitiveParams(undefined)).toBe(undefined);
  });
});

describe('redactAnalyticsEvent', () => {
  it('scrubs the token from $current_url and $referrer', () => {
    const ev = {
      properties: {
        $current_url: 'https://app.com/reset-password?token=abc',
        $referrer: 'https://app.com/verify-email?token=xyz',
        distinct_id: 'u1',
      },
    };
    const out = redactAnalyticsEvent(ev);
    expect(out.properties.$current_url).toBe('https://app.com/reset-password');
    expect(out.properties.$referrer).toBe('https://app.com/verify-email');
    expect(out.properties.distinct_id).toBe('u1');
  });

  it('leaves a clean event untouched', () => {
    const ev = { properties: { $current_url: 'https://app.com/pricing' } };
    expect(redactAnalyticsEvent(ev).properties.$current_url).toBe('https://app.com/pricing');
  });

  it('handles a null event or missing properties without throwing', () => {
    expect(redactAnalyticsEvent(null)).toBeNull();
    expect(() => redactAnalyticsEvent({})).not.toThrow();
  });
});
