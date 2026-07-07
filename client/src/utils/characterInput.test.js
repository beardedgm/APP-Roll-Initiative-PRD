import { describe, it, expect } from 'vitest';
import { clampCharacterFields } from './characterInput';

// f7: the form parsed values straight from parseInt with no clamp, so a typed
// "-5" HP or an out-of-range initMod passed to the store and was later dropped
// by the server (silent device-side loss). Clamp to the server's accepted range
// so nothing invalid is ever created.
describe('clampCharacterFields', () => {
  it('passes valid values through unchanged', () => {
    expect(clampCharacterFields({ maxHP: 42, ac: 15, initMod: 3 }))
      .toEqual({ maxHP: 42, ac: 15, initMod: 3 });
  });

  it('clamps a negative maxHP up to 1', () => {
    expect(clampCharacterFields({ maxHP: -5, ac: 15, initMod: 3 }).maxHP).toBe(1);
  });

  it('preserves a null maxHP (no HP set)', () => {
    expect(clampCharacterFields({ maxHP: null, ac: 15, initMod: 3 }).maxHP).toBeNull();
  });

  it('allows a PF2e-range initMod up to 50', () => {
    expect(clampCharacterFields({ maxHP: 10, ac: 15, initMod: 25 }).initMod).toBe(25);
  });

  it('clamps initMod above 50 and below -10', () => {
    expect(clampCharacterFields({ maxHP: 10, ac: 15, initMod: 99 }).initMod).toBe(50);
    expect(clampCharacterFields({ maxHP: 10, ac: 15, initMod: -99 }).initMod).toBe(-10);
  });

  it('clamps ac into 0..99 and defaults missing numbers', () => {
    expect(clampCharacterFields({ maxHP: 10, ac: 250, initMod: 0 }).ac).toBe(99);
    expect(clampCharacterFields({ maxHP: 10 }).ac).toBe(10);
    expect(clampCharacterFields({ maxHP: 10 }).initMod).toBe(0);
  });
});
