import { describe, it, expect } from 'vitest';
import {
  newEntryId, withEntryIds, stripEntryIds,
  getDefaultFormData, getDefaultPf2eFormData,
  formDataToMonsterAPI, pf2eFormDataToMonsterAPI,
  monsterAPIToFormData, pf2eMonsterAPIToFormData,
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

// H5: editing a PF2e creature must round-trip every form field. The saved
// payload stores level as `cr` and perception as `initMod`, and keeps rarity,
// saves, senses, skills, languages, and immunities/resistances/weaknesses only
// inside the generated rawMarkdown — so the reverse mapper must recover them.
describe('pf2eMonsterAPIToFormData', () => {
  function fullForm() {
    return {
      ...getDefaultPf2eFormData(),
      name: 'Ancient Wyrm',
      level: 7,
      size: 'Large',
      type: 'Dragon',
      rarity: 'Rare',
      perception: 15,
      ac: 25,
      acDesc: 'all-around vision',
      hp: 120,
      fort: 16,
      ref: 12,
      will: 14,
      speed: '40 feet, fly 100 feet',
      abilities: { str: 6, dex: 3, con: 5, int: 2, wis: 4, cha: 3 },
      skills: 'Athletics +17, Stealth +12',
      senses: 'darkvision, scent (imprecise) 60 feet',
      languages: 'Common, Draconic',
      immunities: 'fire, paralyzed',
      resistances: 'physical 10',
      weaknesses: 'cold 10',
      actions: [{ id: 'e1', name: 'Jaws', description: 'bite +17' }],
    };
  }

  it('round-trips every field through save and back', () => {
    const saved = pf2eFormDataToMonsterAPI(fullForm());
    const form = pf2eMonsterAPIToFormData(saved);

    expect(form.name).toBe('Ancient Wyrm');
    expect(form.level).toBe(7);
    expect(form.size).toBe('Large');
    expect(form.type).toBe('Dragon');
    expect(form.rarity).toBe('Rare');
    expect(form.perception).toBe(15);
    expect(form.ac).toBe(25);
    expect(form.acDesc).toBe('all-around vision');
    expect(form.hp).toBe(120);
    expect(form.fort).toBe(16);
    expect(form.ref).toBe(12);
    expect(form.will).toBe(14);
    expect(form.speed).toBe('40 feet, fly 100 feet');
    expect(form.abilities).toEqual({ str: 6, dex: 3, con: 5, int: 2, wis: 4, cha: 3 });
    expect(form.skills).toBe('Athletics +17, Stealth +12');
    expect(form.senses).toBe('darkvision, scent (imprecise) 60 feet');
    expect(form.languages).toBe('Common, Draconic');
    expect(form.immunities).toBe('fire, paralyzed');
    expect(form.resistances).toBe('physical 10');
    expect(form.weaknesses).toBe('cold 10');
    expect(form.actions).toEqual([{ name: 'Jaws', description: 'bite +17' }]);
  });

  it('round-trips negative levels and modifiers (level -1 creature)', () => {
    const saved = pf2eFormDataToMonsterAPI({
      ...getDefaultPf2eFormData(),
      name: 'Goblin Warrior',
      level: -1,
      perception: -1,
      fort: -2,
      abilities: { str: 0, dex: 3, con: 1, int: 0, wis: -1, cha: 1 },
    });
    const form = pf2eMonsterAPIToFormData(saved);
    expect(form.level).toBe(-1);
    expect(form.perception).toBe(-1);
    expect(form.fort).toBe(-2);
    expect(form.abilities.wis).toBe(-1);
  });

  it('clears rawMarkdown when the stored markdown is just the generated block', () => {
    const saved = pf2eFormDataToMonsterAPI(fullForm());
    expect(saved.rawMarkdown).toBeTruthy(); // save stores the generated block
    const form = pf2eMonsterAPIToFormData(saved);
    // Generated markdown must NOT freeze the form — an empty field lets
    // future field edits regenerate the stat block.
    expect(form.rawMarkdown).toBe('');
  });

  it('preserves user-customized rawMarkdown', () => {
    const saved = pf2eFormDataToMonsterAPI({ ...fullForm(), rawMarkdown: '# My Custom Block\ntext' });
    const form = pf2eMonsterAPIToFormData(saved);
    expect(form.rawMarkdown).toBe('# My Custom Block\ntext');
  });

  it('maps the type fallback back to an empty form type', () => {
    // Save-time fallback stores 'Creature' when the form type was empty.
    const saved = pf2eFormDataToMonsterAPI({ ...getDefaultPf2eFormData(), name: 'X', type: '' });
    expect(saved.type).toBe('Creature');
    expect(pf2eMonsterAPIToFormData(saved).type).toBe('');
  });

  it('falls back to defaults for markdown-only fields on hand-written markdown', () => {
    const form = pf2eMonsterAPIToFormData({
      name: 'Legacy Import',
      cr: '4',
      initMod: 9,
      ac: 20,
      hp: 60,
      abilities: { str: 2, dex: 4, con: 2, int: 0, wis: 3, cha: 1 },
      gameSystem: 'pf2e',
      rawMarkdown: '# Legacy Import\nsome hand-written block with none of our patterns',
    });
    // Direct fields still map…
    expect(form.level).toBe(4);
    expect(form.perception).toBe(9);
    expect(form.ac).toBe(20);
    // …markdown-only fields fall back to defaults…
    expect(form.rarity).toBe('Common');
    expect(form.fort).toBe(0);
    expect(form.skills).toBe('');
    // …and the unrecognized markdown is preserved as a custom block.
    expect(form.rawMarkdown).toContain('hand-written');
  });
});

// H5 (5e side): the edit path previously spread the raw saved monster over the
// form, leaking junk keys (slug, rev, deleted, …) back into the next payload.
describe('monsterAPIToFormData (5e)', () => {
  it('maps saved fields and drops junk keys', () => {
    const form = monsterAPIToFormData({
      name: 'Dire Wolf',
      cr: '1',
      ac: 14,
      hp: 37,
      abilities: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 },
      slug: 'custom--dire-wolf',
      rev: 4,
      deleted: false,
      isCustom: true,
      sourceKey: 'custom',
    });
    expect(form.name).toBe('Dire Wolf');
    expect(form.cr).toBe('1');
    expect(form.slug).toBeUndefined();
    expect(form.rev).toBeUndefined();
    expect(form.deleted).toBeUndefined();
    expect(form.sourceKey).toBeUndefined();
  });
});
