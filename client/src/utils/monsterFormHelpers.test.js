import { describe, it, expect } from 'vitest';
import {
  newEntryId, withEntryIds, stripEntryIds,
  getDefaultFormData, getDefaultPf2eFormData,
  formDataToMonsterAPI, pf2eFormDataToMonsterAPI,
} from './monsterFormHelpers';

describe('newEntryId', () => {
  it('produces unique ids', () => {
    const a = newEntryId();
    const b = newEntryId();
    expect(a).not.toBe(b);
    expect(typeof a).toBe('string');
  });
});

describe('withEntryIds', () => {
  it('backfills ids on entries that lack them', () => {
    const form = { traits: [{ name: 'Keen', description: 'd' }], actions: [] };
    const result = withEntryIds(form);
    expect(result.traits[0].id).toBeTruthy();
    expect(result.traits[0].name).toBe('Keen');
  });

  it('preserves existing ids', () => {
    const form = { traits: [{ id: 'fixed', name: 'X', description: '' }] };
    expect(withEntryIds(form).traits[0].id).toBe('fixed');
  });

  it('ignores entry keys that are not arrays (e.g. PF2e has no legendaryActions)', () => {
    const form = getDefaultPf2eFormData();
    expect(() => withEntryIds(form)).not.toThrow();
    expect(withEntryIds(form).legendaryActions).toBeUndefined();
  });
});

describe('stripEntryIds', () => {
  it('removes the UI-only id, keeping name/description', () => {
    const stripped = stripEntryIds([{ id: 'e1', name: 'Bite', description: 'hits' }]);
    expect(stripped).toEqual([{ name: 'Bite', description: 'hits' }]);
  });
});

describe('formDataToMonsterAPI (5e)', () => {
  it('strips entry ids and drops empty entry arrays', () => {
    const form = { ...getDefaultFormData(), traits: [{ id: 'e1', name: 'Keen', description: 'd' }] };
    const api = formDataToMonsterAPI(form);
    expect(api.traits).toEqual([{ name: 'Keen', description: 'd' }]);
    expect(api.actions).toBeUndefined(); // empty array removed
    expect(api.initMod).toBe(0); // DEX 10 -> +0
  });
});

describe('pf2eFormDataToMonsterAPI', () => {
  it('strips entry ids from traits/actions/reactions', () => {
    const form = { ...getDefaultPf2eFormData(), actions: [{ id: 'e1', name: 'Jaws', description: 'bite' }] };
    const api = pf2eFormDataToMonsterAPI(form);
    expect(api.actions).toEqual([{ name: 'Jaws', description: 'bite' }]);
    expect(api.gameSystem).toBe('pf2e');
  });
});
