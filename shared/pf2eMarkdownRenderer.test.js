import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPf2eCreatureToMarkdown } from './pf2eMarkdownRenderer.js';

const AIR_MEPHIT = {
  name: 'Air Mephit',
  source: 'B1',
  level: 1,
  traits: ['N', 'Small', 'Air', 'Elemental'],
  perception: { std: 3, senses: [{ name: 'darkvision' }] },
  languages: { languages: [{ name: 'Auran' }] },
  skills: [{ name: 'Acrobatics', std: 7 }, { name: 'Stealth', std: 7 }],
  abilityMods: { str: -5, dex: 3, con: 0, int: -2, wis: -1, cha: 0 },
  defenses: {
    ac: { std: 16 },
    savingThrows: { fort: { std: 3 }, ref: { std: 9 }, will: { std: 3 } },
    hp: [{ hp: 12 }],
    immunities: [{ name: 'bleed' }, { name: 'paralyzed' }, { name: 'poison' }, { name: 'sleep' }],
  },
  speed: { walk: 20, fly: 40 },
  attacks: [
    {
      type: 'melee',
      name: 'claw',
      attack: 8,
      traits: ['agile', 'finesse'],
      damage: '1d6+1 slashing',
    },
  ],
  spellcasting: [],
  abilities: { top: [], mid: [], bot: [
    {
      name: 'Breath Weapon',
      activity: { unit: 'action', number: 2 },
      entries: ['The air mephit breathes sand and grit in a 15-foot cone.'],
    },
  ]},
};

describe('renderPf2eCreatureToMarkdown', () => {
  it('renders name and level header', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.startsWith('# Air Mephit\n'));
    assert.ok(md.includes('*Creature 1*'));
  });

  it('renders traits line', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('N, Small, Air, Elemental'));
  });

  it('renders perception and senses', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**Perception** +3; darkvision'));
  });

  it('renders ability modifiers', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**STR** -5'));
    assert.ok(md.includes('**DEX** +3'));
  });

  it('renders AC, saves, HP', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**AC** 16'));
    assert.ok(md.includes('**Fort** +3'));
    assert.ok(md.includes('**Ref** +9'));
    assert.ok(md.includes('**Will** +3'));
    assert.ok(md.includes('**HP** 12'));
  });

  it('renders immunities', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**Immunities** bleed, paralyzed, poison, sleep'));
  });

  it('renders speed', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('Speed 20 feet, fly 40 feet'));
  });

  it('renders melee attacks', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**Melee**'));
    assert.ok(md.includes('claw'));
    assert.ok(md.includes('+8'));
    assert.ok(md.includes('agile'));
  });

  it('renders bot abilities with action symbols', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**Breath Weapon** \u25C6\u25C6'));
  });
});

describe('edge cases', () => {
  it('handles multiple HP pools', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Multi-HP',
      defenses: {
        ...AIR_MEPHIT.defenses,
        hp: [{ hp: 50, name: 'body' }, { hp: 20, name: 'shield', abilities: ['hardness 5'] }],
      },
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('50'));
    assert.ok(md.includes('20'));
  });

  it('handles variant ACs', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Shield AC',
      defenses: {
        ...AIR_MEPHIT.defenses,
        ac: { std: 23, 'with shield raised': 25 },
      },
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('23'));
    assert.ok(md.includes('25 with shield raised'));
  });

  it('handles creature with no attacks', () => {
    const creature = { ...AIR_MEPHIT, name: 'Passive', attacks: [] };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('# Passive'));
    assert.ok(!md.includes('**Melee**'));
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = {
      name: 'Minimal',
      source: 'B1',
      level: 0,
      traits: [],
      perception: { std: 0 },
      abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      defenses: {
        ac: { std: 10 },
        savingThrows: { fort: { std: 0 }, ref: { std: 0 }, will: { std: 0 } },
        hp: [{ hp: 1 }],
      },
      speed: { walk: 25 },
      attacks: [],
      spellcasting: [],
      abilities: { top: [], mid: [], bot: [] },
    };
    const md = renderPf2eCreatureToMarkdown(minimal);
    assert.ok(md.startsWith('# Minimal'));
  });
});
