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

  it('renders melee attacks with MAP notation (agile)', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**Melee**'));
    assert.ok(md.includes('claw'));
    // Agile MAP: +8/+4/+0 (−4/−8 instead of −5/−10)
    assert.ok(md.includes('+8/+4/+0'), 'Should show agile MAP notation +8/+4/+0');
    assert.ok(md.includes('agile'));
  });

  it('renders bot abilities with action symbols', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    assert.ok(md.includes('**Breath Weapon** \u25C6\u25C6'));
  });

  // f26: save-outcome degrees and affliction stages were joined with a single \n,
  // so they rendered as one run-together paragraph. Bold entries need a blank
  // line between them to render as separate paragraphs.
  it('separates success-degree outcomes with blank lines', () => {
    const creature = {
      ...AIR_MEPHIT,
      abilities: { top: [], mid: [], bot: [{
        name: 'Breath Weapon',
        entries: [{ type: 'successDegree', entries: {
          'Critical Success': 'CritS', Success: 'Succ', Failure: 'Fail', 'Critical Failure': 'CritF',
        } }],
      }] },
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('**Success** Succ\n\n**Failure** Fail'), 'degrees must be blank-line separated');
  });

  it('separates affliction stages with blank lines', () => {
    const creature = {
      ...AIR_MEPHIT,
      abilities: { top: [], mid: [], bot: [{
        name: 'Venom',
        entries: [{ type: 'affliction', name: 'Venom', DC: 20, savingThrow: 'Fortitude', stages: [
          { stage: 1, entry: 'S1', duration: '1 round' },
          { stage: 2, entry: 'S2', duration: '1 round' },
        ] }],
      }] },
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('**Stage 1** S1 (1 round)\n\n**Stage 2** S2 (1 round)'), 'stages must be blank-line separated');
  });
});

describe('Multiple Attack Penalty (MAP)', () => {
  it('calculates standard MAP for non-agile weapons', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'MAP Test',
      attacks: [
        { range: 'Melee', name: 'longsword', attack: 15, traits: ['versatile <P>'], damage: '1d8+7 slashing' },
      ],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    // Standard MAP: +15/+10/+5 (−5/−10)
    assert.ok(md.includes('+15/+10/+5'), 'Should show standard MAP +15/+10/+5');
  });

  it('calculates agile MAP for agile weapons', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Agile MAP Test',
      attacks: [
        { range: 'Melee', name: 'dagger', attack: 12, traits: ['agile', 'finesse'], damage: '1d4+3 piercing' },
      ],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    // Agile MAP: +12/+8/+4 (−4/−8)
    assert.ok(md.includes('+12/+8/+4'), 'Should show agile MAP +12/+8/+4');
  });

  it('handles high attack bonus with MAP', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'High Attack',
      attacks: [
        { range: 'Melee', name: 'jaws', attack: 28, traits: ['reach <15 feet>'], damage: '2d12+15 piercing' },
      ],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('+28/+23/+18'), 'Should show MAP +28/+23/+18');
  });

  it('formats negative MAP values correctly', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Low Attack',
      attacks: [
        { range: 'Melee', name: 'fist', attack: 3, traits: [], damage: '1d4 bludgeoning' },
      ],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    // +3/−2/−7
    assert.ok(md.includes('+3/-2/-7'), 'Should show MAP +3/-2/-7');
  });

  it('shows MAP on ranged attacks too', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Ranged MAP',
      attacks: [
        { range: 'Ranged', name: 'crossbow', attack: 12, traits: ['range increment <120 feet>'], damage: '1d8+3 piercing' },
      ],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('**Ranged**'));
    assert.ok(md.includes('+12/+7/+2'), 'Should show ranged MAP +12/+7/+2');
  });
});

describe('Recall Knowledge', () => {
  it('renders Recall Knowledge for elemental creatures', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    // Air Mephit traits: ['N', 'Small', 'Air', 'Elemental']
    // Elemental → Arcana, Nature
    assert.ok(md.includes('**Recall Knowledge - Elemental**'), 'Should show Recall Knowledge for elemental');
    assert.ok(md.includes('Arcana'), 'Should include Arcana skill');
    assert.ok(md.includes('Nature'), 'Should include Nature skill');
    // Level 1, common → DC 15
    assert.ok(md.includes('DC 15'), 'Level 1 common creature should be DC 15');
  });

  it('renders Recall Knowledge for undead creatures', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Zombie',
      level: 5,
      traits: ['NE', 'Medium', 'undead', 'mindless'],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(md.includes('**Recall Knowledge - Undead** (Religion): DC 20'));
  });

  it('applies uncommon rarity adjustment (+2)', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Uncommon Dragon',
      level: 5,
      traits: ['uncommon', 'CE', 'Large', 'dragon'],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    // Level 5 base DC = 20, uncommon +2 = 22
    assert.ok(md.includes('DC 22'), 'Uncommon level 5 dragon should be DC 22');
  });

  it('applies rare rarity adjustment (+5)', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Rare Golem',
      level: 10,
      traits: ['rare', 'N', 'Huge', 'construct'],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    // Level 10 base DC = 27, rare +5 = 32
    assert.ok(md.includes('DC 32'), 'Rare level 10 construct should be DC 32');
    assert.ok(md.includes('Arcana'), 'Construct should show Arcana');
    assert.ok(md.includes('Crafting'), 'Construct should show Crafting');
  });

  it('applies unique rarity adjustment (+10)', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Unique Fiend',
      level: 20,
      traits: ['unique', 'CE', 'Gargantuan', 'fiend'],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    // Level 20 base DC = 40, unique +10 = 50
    assert.ok(md.includes('DC 50'), 'Unique level 20 fiend should be DC 50');
  });

  it('skips Recall Knowledge when no matching trait exists', () => {
    const creature = {
      ...AIR_MEPHIT,
      name: 'Unknown Type',
      traits: ['N', 'Medium'],
    };
    const md = renderPf2eCreatureToMarkdown(creature);
    assert.ok(!md.includes('Recall Knowledge'), 'Should not show RK for unmatched traits');
  });

  it('renders before ability modifiers', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    const rkIndex = md.indexOf('Recall Knowledge');
    const abilIndex = md.indexOf('**STR**');
    assert.ok(rkIndex < abilIndex, 'Recall Knowledge should appear before ability modifiers');
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
