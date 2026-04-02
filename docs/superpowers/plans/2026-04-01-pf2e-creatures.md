# PF2e Creature Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Pathfinder 2e creature support — converter, seed pipeline, API filtering, 4-tab UI, custom creation, and JSON import — alongside existing D&D 5e monsters.

**Architecture:** Single `Monster` collection with a `gameSystem` discriminator (`'5e'` or `'pf2e'`). A shared pure-function renderer (`shared/pf2eMarkdownRenderer.js`) converts PF2eTools JSON to markdown, used by both the Node.js converter script and the React import modal. The existing `MonsterDatabase` component accepts a `gameSystem` prop so both tabs share identical UX.

**Tech Stack:** Node.js, MongoDB/Mongoose, React, Vite, Zod, TanStack Query, Zustand

**Design Spec:** `docs/superpowers/specs/2026-04-01-pf2e-creatures-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `shared/pf2eMarkdownRenderer.js` | Pure function: PF2eTools creature JSON → markdown string. No Node/browser deps. |
| `shared/pf2eMarkdownRenderer.test.js` | Tests for the renderer |
| `shared/pf2eTagStripper.js` | Pure function: strips `{@tag content}` template tags to plain text |
| `shared/pf2eTagStripper.test.js` | Tests for the tag stripper |
| `scripts/convertPf2eToMarkdown.js` | CLI script: reads PF2eTools JSON files, writes markdown files to `Monsters/pf2e_*/` |
| `client/src/constants/pf2eSources.js` | PF2e source key → display label + badge mapping |

### Modified Files
| File | Changes |
|------|---------|
| `server/models/Monster.js` | Add `gameSystem` field with index |
| `server/scripts/seedMonsters.js` | Add PF2e markdown parser + source map entries |
| `server/routes/monsters.js` | Add `gameSystem` query param to search and sources endpoints |
| `server/validators/monsters.js` | Add `gameSystem` to schemas |
| `server/validators/userData.js` | Add `gameSystem` to customMonsterSchema |
| `client/src/api/useMonsters.js` | Pass `gameSystem` through all hooks |
| `client/src/components/tracker/LeftPanel.jsx` | 4 tabs: 5E, PF2E, Characters, Encounters |
| `client/src/components/tracker/MonsterDatabase.jsx` | Accept `gameSystem` prop, conditional CR/Level labels, select source constants |
| `client/src/components/monsters/MonsterFormModal.jsx` | Game-system-aware form fields |
| `client/src/components/monsters/ImportMonsterModal.jsx` | Game system toggle, PF2e JSON import path |
| `client/src/utils/monsterFormHelpers.js` | Add PF2e form constants and helpers |
| `client/src/utils/monsterImport.js` | Add PF2e JSON normalization path |
| `package.json` | Add `seed:pf2e-convert` script |

---

## Task 1: PF2e Template Tag Stripper

**Files:**
- Create: `shared/pf2eTagStripper.js`
- Create: `shared/pf2eTagStripper.test.js`

This is a pure utility with no dependencies. It strips PF2eTools `{@tag content}` template tags to plain text.

- [ ] **Step 1: Write the test file**

```js
// shared/pf2eTagStripper.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripPf2eTags } from './pf2eTagStripper.js';

describe('stripPf2eTags', () => {
  it('strips simple tags to their content', () => {
    assert.equal(stripPf2eTags('{@damage 1d6+1}'), '1d6+1');
    assert.equal(stripPf2eTags('{@dice 1d4}'), '1d4');
    assert.equal(stripPf2eTags('{@condition enfeebled 2}'), 'enfeebled 2');
    assert.equal(stripPf2eTags('{@spell lay on hands}'), 'lay on hands');
    assert.equal(stripPf2eTags('{@skill Deception}'), 'Deception');
    assert.equal(stripPf2eTags('{@trait aura}'), 'aura');
  });

  it('handles {@dc N} → "DC N"', () => {
    assert.equal(stripPf2eTags('{@dc 17}'), 'DC 17');
  });

  it('handles {@ability} → full name', () => {
    assert.equal(stripPf2eTags('{@ability str}'), 'Strength');
    assert.equal(stripPf2eTags('{@ability dex}'), 'Dexterity');
    assert.equal(stripPf2eTags('{@ability con}'), 'Constitution');
    assert.equal(stripPf2eTags('{@ability int}'), 'Intelligence');
    assert.equal(stripPf2eTags('{@ability wis}'), 'Wisdom');
    assert.equal(stripPf2eTags('{@ability cha}'), 'Charisma');
  });

  it('uses display text after || separator', () => {
    assert.equal(stripPf2eTags('{@action Strike||Strikes}'), 'Strikes');
    assert.equal(stripPf2eTags('{@spell magic missile||magic missiles}'), 'magic missiles');
  });

  it('strips multiple tags in one string', () => {
    const input = 'Deal {@damage 2d6} fire damage, {@dc 15} Reflex save';
    assert.equal(stripPf2eTags(input), 'Deal 2d6 fire damage, DC 15 Reflex save');
  });

  it('returns plain text unchanged', () => {
    assert.equal(stripPf2eTags('no tags here'), 'no tags here');
    assert.equal(stripPf2eTags(''), '');
  });

  it('handles nested/recursive tags', () => {
    // Some PF2eTools entries have tags inside tags — outer pass should clean them
    assert.equal(stripPf2eTags('{@damage {@dice 1d6+3}}'), '1d6+3');
  });

  it('handles {@quickref} by extracting display text', () => {
    assert.equal(stripPf2eTags('{@quickref persistent damage||3|persistent damage}'), 'persistent damage');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd shared && node --test pf2eTagStripper.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the tag stripper**

```js
// shared/pf2eTagStripper.js

/**
 * Strip PF2eTools template tags from text.
 *
 * Generic rule: {@tag content} → content
 * Display text: {@tag ref||display} → display
 * Special: {@dc N} → "DC N", {@ability str} → "Strength"
 *
 * Pure function, no dependencies.
 */

const ABILITY_MAP = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

/**
 * @param {string} text - Text potentially containing {@tag ...} template tags
 * @returns {string} Plain text with all tags stripped
 */
export function stripPf2eTags(text) {
  if (!text || typeof text !== 'string') return '';

  // Repeatedly strip tags until none remain (handles nested tags)
  let result = text;
  let prev;
  do {
    prev = result;
    result = result.replace(/\{@(\w+)\s+([^{}]*)\}/g, (_, tag, content) => {
      // If content has || separator, use the display text (last segment)
      if (content.includes('||')) {
        const parts = content.split('||');
        return parts[parts.length - 1].trim();
      }

      // Special tag handling
      if (tag === 'dc') return `DC ${content.trim()}`;
      if (tag === 'ability') return ABILITY_MAP[content.trim().toLowerCase()] || content.trim();

      // Generic: return the content as-is
      return content.trim();
    });
  } while (result !== prev);

  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd shared && node --test pf2eTagStripper.test.js`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add shared/pf2eTagStripper.js shared/pf2eTagStripper.test.js
git commit -m "feat(pf2e): add template tag stripper for PF2eTools markup"
```

---

## Task 2: PF2e Markdown Renderer

**Files:**
- Create: `shared/pf2eMarkdownRenderer.js`
- Create: `shared/pf2eMarkdownRenderer.test.js`
- Read: `shared/pf2eTagStripper.js` (from Task 1)

This is the core converter: takes a single PF2eTools creature JSON object and produces a markdown stat block string. It uses the tag stripper from Task 1.

- [ ] **Step 1: Write the test file**

```js
// shared/pf2eMarkdownRenderer.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPf2eCreatureToMarkdown } from './pf2eMarkdownRenderer.js';

// Minimal creature fixture (Air Mephit simplified)
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
  abilities: {
    top: [],
    mid: [],
    bot: [
      {
        name: 'Breath Weapon',
        activity: { unit: 'action', number: 2 },
        entries: ['The air mephit breathes sand and grit in a 15-foot cone.'],
      },
    ],
  },
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

  it('returns extractable metadata', () => {
    const md = renderPf2eCreatureToMarkdown(AIR_MEPHIT);
    // The markdown should be parseable by the seed script
    assert.ok(md.includes('# Air Mephit'));
    assert.ok(md.includes('*Creature 1*'));
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd shared && node --test pf2eMarkdownRenderer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the renderer**

```js
// shared/pf2eMarkdownRenderer.js

/**
 * Convert a PF2eTools creature JSON object to a markdown stat block string.
 *
 * Pure function — no Node.js or browser dependencies.
 * Used by: scripts/convertPf2eToMarkdown.js (Node), client import modal (browser).
 *
 * @param {object} creature - A PF2eTools creature JSON object
 * @returns {string} Markdown stat block
 */

import { stripPf2eTags } from './pf2eTagStripper.js';

// Action cost symbols
const ACTION_SYMBOLS = {
  1: '\u25C6',       // ◆
  2: '\u25C6\u25C6',  // ◆◆
  3: '\u25C6\u25C6\u25C6', // ◆◆◆
};
const FREE_ACTION = '\u25C7'; // ◇

export function renderPf2eCreatureToMarkdown(creature) {
  const lines = [];
  const c = creature;

  // ── Header ──
  lines.push(`# ${strip(c.name)}`);
  lines.push(`*Creature ${c.level}*`);
  lines.push('');

  // ── Traits ──
  if (c.traits && c.traits.length > 0) {
    lines.push(c.traits.map(t => strip(typeof t === 'string' ? t : t.name || t)).join(', '));
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // ── Perception ──
  const perception = c.perception || {};
  const perceptionMod = formatMod(perception.std || 0);
  const senses = (perception.senses || [])
    .map(s => {
      if (typeof s === 'string') return strip(s);
      let text = strip(s.name || '');
      if (s.range) text += ` ${s.range} feet`;
      return text;
    })
    .filter(Boolean);
  lines.push(`**Perception** ${perceptionMod}${senses.length ? '; ' + senses.join(', ') : ''}`);

  // ── Languages ──
  if (c.languages) {
    const langs = (c.languages.languages || []).map(l => strip(typeof l === 'string' ? l : l.name || '')).filter(Boolean);
    const abilities = (c.languages.abilities || []).map(a => strip(typeof a === 'string' ? a : a.name || '')).filter(Boolean);
    const langParts = [...langs];
    if (abilities.length) langParts.push(...abilities);
    if (langParts.length) lines.push(`**Languages** ${langParts.join(', ')}`);
  }

  // ── Skills ──
  if (c.skills && c.skills.length > 0) {
    const skillParts = c.skills.map(s => `${strip(s.name)} ${formatMod(s.std || 0)}`);
    lines.push(`**Skills** ${skillParts.join(', ')}`);
  }

  // ── Ability Modifiers ──
  if (c.abilityMods) {
    const am = c.abilityMods;
    lines.push(`**STR** ${formatMod(am.str)}, **DEX** ${formatMod(am.dex)}, **CON** ${formatMod(am.con)}, **INT** ${formatMod(am.int)}, **WIS** ${formatMod(am.wis)}, **CHA** ${formatMod(am.cha)}`);
  }

  // ── Items ──
  if (c.items && c.items.length > 0) {
    const itemNames = c.items.map(i => strip(typeof i === 'string' ? i : i.name || '')).filter(Boolean);
    if (itemNames.length) lines.push(`**Items** ${itemNames.join(', ')}`);
  }

  // ── Top abilities ──
  renderAbilities(lines, c.abilities?.top);

  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Defenses ──
  const def = c.defenses || {};

  // AC
  const ac = def.ac || {};
  const acParts = [];
  const stdAC = ac.std || 10;
  acParts.push(String(stdAC));
  for (const [key, val] of Object.entries(ac)) {
    if (key !== 'std' && key !== 'abilities') {
      acParts.push(`${val} ${key}`);
    }
  }
  const acAbilities = ac.abilities ? ac.abilities.map(a => strip(a)).join('; ') : '';
  lines.push(`**AC** ${acParts.join('; ')}${acAbilities ? '; ' + acAbilities : ''}`);

  // Saves
  const saves = def.savingThrows || {};
  const fortMod = formatMod(saves.fort?.std || 0);
  const refMod = formatMod(saves.ref?.std || 0);
  const willMod = formatMod(saves.will?.std || 0);
  const saveAbilities = (saves.abilities || []).map(a => strip(a));
  lines.push(`**Fort** ${fortMod}, **Ref** ${refMod}, **Will** ${willMod}${saveAbilities.length ? '; ' + saveAbilities.join('; ') : ''}`);

  // HP
  const hpPools = def.hp || [{ hp: 1 }];
  const hpParts = hpPools.map(pool => {
    let text = String(pool.hp);
    if (pool.name) text = `${pool.name} ${text}`;
    const hpAbilities = (pool.abilities || []).map(a => strip(a));
    if (hpAbilities.length) text += ' (' + hpAbilities.join(', ') + ')';
    return text;
  });
  lines.push(`**HP** ${hpParts.join(', ')}`);

  // Immunities
  if (def.immunities && def.immunities.length > 0) {
    lines.push(`**Immunities** ${def.immunities.map(i => strip(typeof i === 'string' ? i : i.name || '')).join(', ')}`);
  }

  // Resistances
  if (def.resistances && def.resistances.length > 0) {
    lines.push(`**Resistances** ${def.resistances.map(r => {
      const name = strip(typeof r === 'string' ? r : r.name || '');
      const amount = r.amount ? ` ${r.amount}` : '';
      return `${name}${amount}`;
    }).join(', ')}`);
  }

  // Weaknesses
  if (def.weaknesses && def.weaknesses.length > 0) {
    lines.push(`**Weaknesses** ${def.weaknesses.map(w => {
      const name = strip(typeof w === 'string' ? w : w.name || '');
      const amount = w.amount ? ` ${w.amount}` : '';
      return `${name}${amount}`;
    }).join(', ')}`);
  }

  // ── Mid abilities (reactions, auras) ──
  renderAbilities(lines, c.abilities?.mid);

  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Attacks ──
  if (c.attacks && c.attacks.length > 0) {
    for (const atk of c.attacks) {
      const type = (atk.type || 'melee').charAt(0).toUpperCase() + (atk.type || 'melee').slice(1);
      const traits = atk.traits && atk.traits.length > 0 ? ` [${atk.traits.join(', ')}]` : '';
      const damage = atk.damage ? `, **Damage** ${strip(atk.damage)}` : '';
      lines.push(`**${type}** \u25C6 ${strip(atk.name)} ${formatMod(atk.attack || 0)}${traits}${damage}`);
      lines.push('');
    }
  }

  // ── Spellcasting ──
  if (c.spellcasting && c.spellcasting.length > 0) {
    for (const entry of c.spellcasting) {
      const castType = strip(entry.type || 'Innate');
      const tradition = strip(entry.tradition || '');
      const dc = entry.DC ? `DC ${entry.DC}` : '';
      const attack = entry.attack ? `, attack ${formatMod(entry.attack)}` : '';

      const header = `**${castType} ${tradition} Spells** ${dc}${attack}`;
      const spellLines = [];

      const spellEntries = entry.entry || {};
      for (const [level, spells] of Object.entries(spellEntries).sort((a, b) => Number(b[0]) - Number(a[0]))) {
        if (!Array.isArray(spells)) continue;
        const levelLabel = level === '0' ? `Cantrips (${entry.cantripLevel || '1st'})` : ordinal(Number(level));
        const spellNames = spells.map(sp => {
          if (typeof sp === 'string') return strip(sp);
          let name = strip(sp.name || '');
          const notes = [];
          if (sp.amount) notes.push(sp.amount);
          if (sp.notes) notes.push(...sp.notes.map(n => strip(n)));
          return notes.length ? `${name} (${notes.join(', ')})` : name;
        });
        spellLines.push(`${levelLabel}: ${spellNames.join(', ')}`);
      }

      // Focus spells
      if (entry.fp) {
        const fpText = `(${entry.fp} Focus Point${entry.fp > 1 ? 's' : ''})`;
        lines.push(`${header} ${fpText}; ${spellLines.join('; ')}`);
      } else {
        lines.push(`${header}; ${spellLines.join('; ')}`);
      }
      lines.push('');
    }
  }

  // ── Bot abilities ──
  renderAbilities(lines, c.abilities?.bot);

  return lines.join('\n');
}

// ── Helpers ──

function strip(text) {
  return stripPf2eTags(typeof text === 'string' ? text : String(text || ''));
}

function formatMod(n) {
  const num = Number(n) || 0;
  return num >= 0 ? `+${num}` : String(num);
}

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function renderAbilities(lines, abilities) {
  if (!abilities || abilities.length === 0) return;
  lines.push('');
  for (const ability of abilities) {
    const parts = [];
    parts.push(`**${strip(ability.name)}**`);

    // Action symbols
    if (ability.activity) {
      const unit = ability.activity.unit;
      const num = ability.activity.number || 1;
      if (unit === 'action') {
        parts.push(ACTION_SYMBOLS[num] || '\u25C6');
      } else if (unit === 'reaction') {
        parts.push('\u25C6 (reaction)');
      } else if (unit === 'free') {
        parts.push(FREE_ACTION);
      }
    }

    // Traits
    if (ability.traits && ability.traits.length > 0) {
      parts.push(`(${ability.traits.map(t => strip(t)).join(', ')})`);
    }

    // Trigger, Frequency, Requirements
    if (ability.trigger) parts.push(`**Trigger** ${strip(ability.trigger)};`);
    if (ability.frequency) {
      const freq = ability.frequency;
      const freqText = typeof freq === 'string' ? strip(freq) : strip(freq.special || `${freq.number || 1} per ${freq.unit || 'day'}`);
      parts.push(`**Frequency** ${freqText};`);
    }
    if (ability.requirements) parts.push(`**Requirements** ${strip(ability.requirements)};`);

    // Entries
    const entries = (ability.entries || []).map(e => {
      if (typeof e === 'string') return strip(e);
      if (e.type === 'list' && e.items) {
        return e.items.map(item => `- ${strip(typeof item === 'string' ? item : item.entry || item.name || '')}`).join('\n');
      }
      if (e.type === 'successDegree' && e.entries) {
        const degrees = [];
        for (const [degree, text] of Object.entries(e.entries)) {
          degrees.push(`**${degree.charAt(0).toUpperCase() + degree.slice(1)}** ${strip(text)}`);
        }
        return degrees.join(' ');
      }
      return strip(JSON.stringify(e));
    });

    lines.push(`${parts.join(' ')} ${entries.join(' ')}`);
    lines.push('');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shared && node --test pf2eMarkdownRenderer.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add shared/pf2eMarkdownRenderer.js shared/pf2eMarkdownRenderer.test.js
git commit -m "feat(pf2e): add JSON to markdown renderer for PF2eTools creatures"
```

---

## Task 3: PF2eTools JSON Converter Script

**Files:**
- Create: `scripts/convertPf2eToMarkdown.js`
- Modify: `package.json` (add script)
- Read: `shared/pf2eMarkdownRenderer.js` (from Task 2)

This Node.js script reads all 129 PF2eTools bestiary JSON files from a local directory, converts each creature to markdown using the shared renderer, and writes the output to `Monsters/pf2e_*/` directories.

- [ ] **Step 1: Create the converter script**

```js
// scripts/convertPf2eToMarkdown.js

/**
 * Convert PF2eTools bestiary JSON files to markdown stat blocks.
 *
 * Usage:
 *   node scripts/convertPf2eToMarkdown.js <path-to-pf2etools-bestiary-dir>
 *
 * Example:
 *   node scripts/convertPf2eToMarkdown.js ../Pf2eTools/data/bestiary
 *
 * Reads: creatures-*.json files from the provided directory
 * Writes: Monsters/pf2e_{sourceKey}/{slug}.md files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPf2eCreatureToMarkdown } from '../shared/pf2eMarkdownRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONSTERS_DIR = path.join(__dirname, '..', 'Monsters');

// ── Source code → folder key mapping ──
// Built by scanning PF2eTools source codes.
// The source JSON field is a short code like "B1", "B2", "AV", etc.
function sourceToKey(sourceCode) {
  return `pf2e_${sourceCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function main() {
  const bestiaryDir = process.argv[2];
  if (!bestiaryDir) {
    console.error('Usage: node scripts/convertPf2eToMarkdown.js <path-to-pf2etools-bestiary-dir>');
    console.error('Example: node scripts/convertPf2eToMarkdown.js ../Pf2eTools/data/bestiary');
    process.exit(1);
  }

  const resolvedDir = path.resolve(bestiaryDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  // Find all creatures-*.json files
  const jsonFiles = fs.readdirSync(resolvedDir)
    .filter(f => f.startsWith('creatures-') && f.endsWith('.json'))
    .sort();

  console.log(`Found ${jsonFiles.length} bestiary files in ${resolvedDir}`);

  let totalCreatures = 0;
  let totalErrors = 0;
  const sourceStats = {};

  for (const jsonFile of jsonFiles) {
    const filePath = path.join(resolvedDir, jsonFile);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`  ERROR reading ${jsonFile}: ${err.message}`);
      totalErrors++;
      continue;
    }

    const creatures = data.creature || [];
    if (creatures.length === 0) {
      console.log(`  ${jsonFile}: no creatures`);
      continue;
    }

    console.log(`  ${jsonFile}: ${creatures.length} creatures`);

    for (const creature of creatures) {
      try {
        const sourceCode = creature.source || 'unknown';
        const sourceKey = sourceToKey(sourceCode);
        const slug = slugify(creature.name);

        // Create output directory
        const outDir = path.join(MONSTERS_DIR, sourceKey);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        // Render markdown
        const markdown = renderPf2eCreatureToMarkdown(creature);

        // Write file
        const outPath = path.join(outDir, `${slug}.md`);
        fs.writeFileSync(outPath, markdown, 'utf8');

        totalCreatures++;
        sourceStats[sourceKey] = (sourceStats[sourceKey] || 0) + 1;
      } catch (err) {
        console.error(`  ERROR converting ${creature.name || 'unknown'}: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\nDone. Converted ${totalCreatures} creatures (${totalErrors} errors).`);
  console.log('\nPer-source breakdown:');
  for (const [key, count] of Object.entries(sourceStats).sort()) {
    console.log(`  ${key}: ${count}`);
  }
}

main();
```

- [ ] **Step 2: Add npm script to root package.json**

In `package.json`, add to the `scripts` object:

```json
"seed:pf2e-convert": "node scripts/convertPf2eToMarkdown.js"
```

The full scripts section becomes:
```json
"scripts": {
  "dev": "concurrently -n server,client -c blue,green \"npm run dev:server\" \"npm run dev:client\"",
  "dev:client": "cd client && npm run dev",
  "dev:server": "cd server && npm run dev",
  "build": "cd client && npm install --include=dev && npm run build && cd ../server && npm install",
  "start": "cd server && npm start",
  "seed:monsters": "cd server && npm run seed:monsters",
  "seed:pf2e-convert": "node scripts/convertPf2eToMarkdown.js"
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/convertPf2eToMarkdown.js package.json
git commit -m "feat(pf2e): add PF2eTools JSON to markdown converter script"
```

Note: The converter will be run manually later after cloning the PF2eTools repo. The generated markdown files will be committed to the repo.

---

## Task 4: Monster Model — Add `gameSystem` Field

**Files:**
- Modify: `server/models/Monster.js`

- [ ] **Step 1: Add the `gameSystem` field and index**

In `server/models/Monster.js`, add the `gameSystem` field to the schema and a compound index:

```js
// server/models/Monster.js
import mongoose from 'mongoose';

const MonsterSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  source:     { type: String, required: true },
  sourceKey:  { type: String, required: true },
  gameSystem: { type: String, enum: ['5e', 'pf2e'], default: '5e', index: true },
  cr:         { type: String },
  crNumeric:  { type: Number },
  hp:         { type: Number },
  hpFormula:  { type: String },
  ac:         { type: Number },
  acDesc:     { type: String },
  initMod:    { type: Number, default: 0 },
  size:       { type: String },
  type:       { type: String },
  alignment:  { type: String },
  abilities: {
    str: Number,
    dex: Number,
    con: Number,
    int: Number,
    wis: Number,
    cha: Number,
  },
  rawMarkdown: { type: String },
  isCustom:   { type: Boolean, default: false },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isPublic:   { type: Boolean, default: false },
}, { timestamps: true });

MonsterSchema.index({ name: 'text', type: 'text', source: 'text' });
MonsterSchema.index({ crNumeric: 1 });
MonsterSchema.index({ sourceKey: 1 });
MonsterSchema.index({ name: 1 });
MonsterSchema.index({ isCustom: 1, createdBy: 1 });
MonsterSchema.index({ gameSystem: 1, sourceKey: 1 });

const Monster = mongoose.model('Monster', MonsterSchema);

export default Monster;
```

Changes:
- Added `gameSystem` field on line 7 with enum, default `'5e'`, and its own index
- Added compound index `{ gameSystem: 1, sourceKey: 1 }` on the second-to-last index line

- [ ] **Step 2: Verify the server starts**

Run: `cd server && node -e "import('./models/Monster.js').then(m => console.log('OK', Object.keys(m.default.schema.paths)))"`
Expected: `OK` with `gameSystem` in the paths list

- [ ] **Step 3: Commit**

```bash
git add server/models/Monster.js
git commit -m "feat(pf2e): add gameSystem field to Monster model"
```

---

## Task 5: Seed Script — Add PF2e Markdown Parser

**Files:**
- Modify: `server/scripts/seedMonsters.js`

The seed script needs a new parser for PF2e markdown files (produced by the converter in Task 3). PF2e markdown uses a different format than 5e — see the spec's "Markdown Format" section.

- [ ] **Step 1: Add PF2e source map entries and parser to the seed script**

Add PF2e entries to `SOURCE_MAP` and a `parsePf2e` function. The key insight: the seed script needs to extract structured data FROM the markdown it produced, so the parser must match the renderer's output format.

In `server/scripts/seedMonsters.js`, make these changes:

**After the existing `SOURCE_MAP` object (line 39), add:**

```js
// PF2e sources will be auto-detected from pf2e_* folders in Monsters/
// We build their SOURCE_MAP entries dynamically below.
```

**Replace the `seed()` function** with a version that auto-detects PF2e folders:

```js
// ── Parse PF2e markdown format ──────────────────────────────
function parsePf2e(md) {
  const result = { abilities: {} };

  // Name: first # heading
  const nameMatch = md.match(/^#\s+(.+)$/m);
  result.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Level: *Creature N*
  const levelMatch = md.match(/\*Creature\s+(-?\d+)\*/);
  if (levelMatch) {
    result.cr = levelMatch[1]; // Store level as "cr" string
    result.crNumeric = parseInt(levelMatch[1]);
  } else {
    result.cr = '0';
    result.crNumeric = 0;
  }

  // Perception: **Perception** +N
  const perceptionMatch = md.match(/\*\*Perception\*\*\s+([+-]?\d+)/);
  result.initMod = perceptionMatch ? parseInt(perceptionMatch[1]) : 0;

  // AC: **AC** N
  const acMatch = md.match(/\*\*AC\*\*\s+(\d+)/);
  result.ac = acMatch ? parseInt(acMatch[1]) : 10;

  // HP: **HP** N
  const hpMatch = md.match(/\*\*HP\*\*\s+(\d+)/);
  result.hp = hpMatch ? parseInt(hpMatch[1]) : 1;

  // Fort/Ref/Will: **Fort** +N, **Ref** +N, **Will** +N
  // (stored in rawMarkdown, not separate fields for seeded monsters)

  // Ability modifiers: **STR** +N, **DEX** +N, ...
  const abilityLine = md.match(/\*\*STR\*\*\s+([+-]?\d+).*?\*\*DEX\*\*\s+([+-]?\d+).*?\*\*CON\*\*\s+([+-]?\d+).*?\*\*INT\*\*\s+([+-]?\d+).*?\*\*WIS\*\*\s+([+-]?\d+).*?\*\*CHA\*\*\s+([+-]?\d+)/);
  if (abilityLine) {
    // PF2e stores modifiers, not scores. Store the modifier directly.
    result.abilities.str = parseInt(abilityLine[1]);
    result.abilities.dex = parseInt(abilityLine[2]);
    result.abilities.con = parseInt(abilityLine[3]);
    result.abilities.int = parseInt(abilityLine[4]);
    result.abilities.wis = parseInt(abilityLine[5]);
    result.abilities.cha = parseInt(abilityLine[6]);
  }

  // Traits line: the line right after the *Creature N* line, before the first ---
  const lines = md.split('\n');
  const creatureLineIdx = lines.findIndex(l => /\*Creature\s+(-?\d+)\*/.test(l));
  if (creatureLineIdx !== -1) {
    // Look for the next non-empty line that isn't a --- separator
    for (let i = creatureLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line === '---') break;
      // This is the traits line
      result.type = line; // Store full traits string as "type"
      break;
    }
  }

  // Size: extract from traits line (second trait is typically size)
  if (result.type) {
    const traitParts = result.type.split(',').map(t => t.trim());
    const sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    const sizeFound = traitParts.find(t => sizes.includes(t));
    result.size = sizeFound || '';
  }

  // Alignment: first trait is typically alignment (N, NG, CE, etc.) or rarity
  result.alignment = ''; // PF2e uses traits instead of alignment

  return result;
}

// ── Build full source map including PF2e auto-detected folders ──
function buildSourceMap() {
  const fullMap = { ...SOURCE_MAP };

  // Auto-detect pf2e_* folders
  if (fs.existsSync(MONSTERS_DIR)) {
    const dirs = fs.readdirSync(MONSTERS_DIR).filter(d => d.startsWith('pf2e_'));
    for (const dir of dirs) {
      if (!fullMap[dir]) {
        // Derive a label from the folder name: pf2e_b1 → "PF2e B1"
        const code = dir.replace('pf2e_', '').toUpperCase();
        fullMap[dir] = { key: dir, label: `PF2e ${code}`, format: 'pf2e', gameSystem: 'pf2e' };
      }
    }
  }

  return fullMap;
}

// ── Main seed function ───────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  const ops = [];
  let totalFiles = 0;
  let errors = 0;

  const fullSourceMap = buildSourceMap();

  for (const [folder, config] of Object.entries(fullSourceMap)) {
    const folderPath = path.join(MONSTERS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`  Skipping missing folder: ${folder}`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    console.log(`  ${config.label}: ${files.length} files`);

    for (const file of files) {
      try {
        const md = fs.readFileSync(path.join(folderPath, file), 'utf8');
        const slug = `${config.key}--${slugFromFilename(file)}`;

        let parsed;
        if (config.format === 'pf2e') {
          parsed = parsePf2e(md);
        } else if (config.format === '5.2') {
          parsed = parse52(md);
        } else if (config.format === 'black_flag') {
          parsed = parseBlackFlag(md);
        } else {
          parsed = parseStandard(md, config.key);
        }

        const gameSystem = config.gameSystem || '5e';

        ops.push({
          updateOne: {
            filter: { slug },
            update: {
              $set: {
                name: parsed.name,
                slug,
                source: config.label,
                sourceKey: config.key,
                gameSystem,
                cr: parsed.cr || '',
                crNumeric: parsed.crNumeric || 0,
                hp: parsed.hp || 0,
                hpFormula: parsed.hpFormula || '',
                ac: parsed.ac || 10,
                acDesc: parsed.acDesc || '',
                initMod: parsed.initMod || 0,
                size: parsed.size || '',
                type: parsed.type || '',
                alignment: parsed.alignment || '',
                abilities: parsed.abilities || {},
                rawMarkdown: md,
              },
            },
            upsert: true,
          },
        });

        totalFiles++;
      } catch (err) {
        console.error(`  ERROR parsing ${file}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nParsed ${totalFiles} monsters (${errors} errors).`);
  console.log('Writing to MongoDB...');

  // bulkWrite in batches of 500
  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);
    const result = await Monster.bulkWrite(batch);
    written += result.upsertedCount + result.modifiedCount;
  }

  console.log(`Done. ${written} documents upserted/modified.`);
  console.log(`Total in DB: ${await Monster.countDocuments()}`);

  await mongoose.connection.close();
}
```

The changes are:
1. Added `parsePf2e()` function that reads the PF2e markdown format
2. Added `buildSourceMap()` that auto-detects `pf2e_*` folders alongside existing 5e sources
3. Modified the seed loop to pass `gameSystem` in the `$set` operation
4. Existing 5e parsers and SOURCE_MAP entries are untouched

- [ ] **Step 2: Commit**

```bash
git add server/scripts/seedMonsters.js
git commit -m "feat(pf2e): extend seed script with PF2e markdown parser and auto-detect"
```

---

## Task 6: API Routes — Add `gameSystem` Filter

**Files:**
- Modify: `server/routes/monsters.js`
- Modify: `server/validators/monsters.js`

- [ ] **Step 1: Update the monster validator to accept `gameSystem`**

In `server/validators/monsters.js`, add `gameSystem` to the search schema. Add a new exported schema for search query validation:

```js
// server/validators/monsters.js
import { z } from 'zod';

const VALID_GAME_SYSTEMS = ['5e', 'pf2e'];

const abilitiesSchema = z.object({
  str: z.number().int().min(1).max(30).optional(),
  dex: z.number().int().min(1).max(30).optional(),
  con: z.number().int().min(1).max(30).optional(),
  int: z.number().int().min(1).max(30).optional(),
  wis: z.number().int().min(1).max(30).optional(),
  cha: z.number().int().min(1).max(30).optional(),
}).optional();

const VALID_CRS = [
  '0', '1/8', '1/4', '1/2',
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
];

export const createMonsterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  size: z.string().max(50).optional(),
  type: z.string().max(100).optional(),
  alignment: z.string().max(100).optional(),
  cr: z.string().refine(v => !v || VALID_CRS.includes(v), { message: 'Invalid CR value' }).optional(),
  hp: z.number().int().min(1).max(99999).optional(),
  hpFormula: z.string().max(50).optional(),
  ac: z.number().int().min(0).max(30).optional(),
  acDesc: z.string().max(200).optional(),
  initMod: z.number().int().min(-10).max(20).optional(),
  abilities: abilitiesSchema,
  rawMarkdown: z.string().max(50000).optional(),
  gameSystem: z.enum(VALID_GAME_SYSTEMS).optional().default('5e'),
});

export const updateMonsterSchema = createMonsterSchema.partial();

export const searchMonsterSchema = z.object({
  q: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  cr: z.string().max(10).optional(),
  type: z.string().max(100).optional(),
  gameSystem: z.enum(VALID_GAME_SYSTEMS).optional().default('5e'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  skip: z.coerce.number().int().min(0).optional().default(0),
});
```

Changes: Added `VALID_GAME_SYSTEMS`, `gameSystem` to `createMonsterSchema`, and new `searchMonsterSchema`.

- [ ] **Step 2: Update routes to filter by `gameSystem`**

In `server/routes/monsters.js`:

```js
import { Router } from 'express';
import Monster from '../models/Monster.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

/** Helper: parse CR string to numeric */
function crToNumeric(crStr) {
  if (!crStr) return undefined;
  if (crStr.includes('/')) {
    const [num, den] = crStr.split('/').map(Number);
    return den ? num / den : 0;
  }
  return parseFloat(crStr);
}

/**
 * GET /api/monsters/search?q=goblin&source=5.1_srd&cr=1/4&type=beast&gameSystem=5e&limit=20&skip=0
 * Public — returns seeded (non-custom) monsters only, filtered by game system.
 */
router.get('/api/monsters/search', asyncHandler(async (req, res) => {
  const { q, source, cr, type, gameSystem = '5e', limit = 20, skip = 0 } = req.query;
  const filter = { gameSystem };

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(escaped, 'i');
  }

  if (source) {
    filter.sourceKey = source;
  }

  if (cr !== undefined && cr !== '') {
    const crStr = cr.trim();
    if (gameSystem === 'pf2e') {
      // PF2e: cr param is a level number (integer)
      filter.crNumeric = parseInt(crStr);
    } else {
      filter.crNumeric = crToNumeric(crStr);
    }
  }

  if (type && type.trim()) {
    const escapedType = type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.type = new RegExp(escapedType, 'i');
  }

  // Exclude custom monsters — they now live in UserData
  if (!filter.sourceKey) {
    filter.isCustom = { $ne: true };
  }

  const lim = Math.min(parseInt(limit) || 20, 50);
  const sk = Math.max(parseInt(skip) || 0, 0);

  const [monsters, total] = await Promise.all([
    Monster.find(filter)
      .select('name slug source sourceKey cr crNumeric hp ac initMod size type alignment gameSystem')
      .sort({ name: 1 })
      .skip(sk)
      .limit(lim),
    Monster.countDocuments(filter),
  ]);

  res.json({ results: monsters, total, limit: lim, skip: sk });
}));

/**
 * GET /api/monsters/sources?gameSystem=5e — list all unique sourceKeys with labels (seeded only)
 */
router.get('/api/monsters/sources', asyncHandler(async (req, res) => {
  const { gameSystem = '5e' } = req.query;
  const pipeline = [
    { $match: { isCustom: { $ne: true }, gameSystem } },
    { $group: { _id: '$sourceKey', label: { $first: '$source' }, count: { $sum: 1 } } },
    { $sort: { label: 1 } },
  ];
  const sources = await Monster.aggregate(pipeline);
  res.json(sources.map(s => ({ key: s._id, label: s.label, count: s.count })));
}));

/**
 * GET /api/monsters/:slug — full stat block for seeded monsters
 */
router.get('/api/monsters/:slug', asyncHandler(async (req, res) => {
  // M-8: Validate slug format (alphanumeric + hyphens + underscores, max 200 chars)
  if (!/^[a-z0-9_-]{1,200}$/i.test(req.params.slug)) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }

  const monster = await Monster.findOne({ slug: req.params.slug, isCustom: { $ne: true } });
  if (!monster) {
    return res.status(404).json({ error: 'Monster not found' });
  }
  res.json(monster);
}));

export default router;
```

Changes:
1. `GET /search`: Added `gameSystem` to filter object, PF2e-aware CR parsing (integer vs fraction)
2. `GET /sources`: Added `gameSystem` param, filters aggregate by it
3. `GET /:slug`: Updated slug regex to allow underscores (PF2e slugs like `pf2e_b1--air-mephit`)
4. Added `gameSystem` to the `.select()` projection

- [ ] **Step 3: Commit**

```bash
git add server/routes/monsters.js server/validators/monsters.js
git commit -m "feat(pf2e): add gameSystem filter to monster API routes and validators"
```

---

## Task 7: UserData Validator — Add `gameSystem` to Custom Monsters

**Files:**
- Modify: `server/validators/userData.js`

- [ ] **Step 1: Add `gameSystem` to customMonsterSchema**

In `server/validators/userData.js`, add this field to the `customMonsterSchema` object (after the `source` field, around line 49):

```js
gameSystem: z.enum(['5e', 'pf2e']).optional().default('5e'),
```

The updated `customMonsterSchema` starts:
```js
const customMonsterSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  isCustom: z.boolean().optional().default(true),
  sourceKey: z.string().max(50).optional().default('custom'),
  source: z.string().max(50).optional().default('Custom'),
  gameSystem: z.enum(['5e', 'pf2e']).optional().default('5e'),
  // ... rest unchanged
```

- [ ] **Step 2: Commit**

```bash
git add server/validators/userData.js
git commit -m "feat(pf2e): add gameSystem to custom monster validator"
```

---

## Task 8: Client API Hooks — Pass `gameSystem`

**Files:**
- Modify: `client/src/api/useMonsters.js`

- [ ] **Step 1: Update all hooks to accept and pass `gameSystem`**

```js
// client/src/api/useMonsters.js
import { useQuery } from '@tanstack/react-query';
import api from './axiosInstance';

/**
 * Quick search for add-combatant dropdown (min 2 chars).
 */
export function useMonsterSearch(query, gameSystem = '5e', options = {}) {
  return useQuery({
    queryKey: ['monsters', 'search', query, gameSystem],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return { results: [], total: 0 };
      const { data } = await api.get('/monsters/search', {
        params: { q: query.trim(), limit: 20, gameSystem },
      });
      return data;
    },
    enabled: !!query && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: prev => prev,
    ...options,
  });
}

/**
 * Browseable paginated listing with filters.
 */
export function useMonsterBrowse(filters = {}) {
  const { q, source, cr, type, gameSystem = '5e', limit = 20, skip = 0 } = filters;
  return useQuery({
    queryKey: ['monsters', 'browse', { q, source, cr, type, gameSystem, limit, skip }],
    queryFn: async () => {
      const params = { limit, skip, gameSystem };
      if (q && q.trim().length >= 1) params.q = q.trim();
      if (source) params.source = source;
      if (cr !== undefined && cr !== '') params.cr = cr;
      if (type) params.type = type;
      const { data } = await api.get('/monsters/search', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: prev => prev,
  });
}

/**
 * Full stat block by slug.
 */
export function useMonster(slug) {
  return useQuery({
    queryKey: ['monsters', 'detail', slug],
    queryFn: async () => {
      const { data } = await api.get(`/monsters/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Available source books for a game system.
 */
export function useMonsterSources(gameSystem = '5e') {
  return useQuery({
    queryKey: ['monsters', 'sources', gameSystem],
    queryFn: async () => {
      const { data } = await api.get('/monsters/sources', { params: { gameSystem } });
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
```

Changes:
1. `useMonsterSearch`: Added `gameSystem` parameter (default `'5e'`), included in query key and params
2. `useMonsterBrowse`: Extracts `gameSystem` from filters, passes to API
3. `useMonster`: Unchanged (slugs are globally unique)
4. `useMonsterSources`: Added `gameSystem` parameter, passes to API

- [ ] **Step 2: Verify client builds**

Run: `cd client && npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/api/useMonsters.js
git commit -m "feat(pf2e): pass gameSystem through all monster API hooks"
```

---

## Task 9: PF2e Source Constants

**Files:**
- Create: `client/src/constants/pf2eSources.js`

- [ ] **Step 1: Create the PF2e source badge mapping**

```js
// client/src/constants/pf2eSources.js

/**
 * PF2e source key → badge abbreviation mapping.
 * Source keys match the pf2e_* folder names produced by the converter.
 * This will be populated as PF2e sources are seeded — the /sources API
 * endpoint provides the full list. These badges are just display shorthand.
 */
const PF2E_SOURCE_BADGES = {
  pf2e_b1: 'B1',
  pf2e_b2: 'B2',
  pf2e_b3: 'B3',
  pf2e_bb: 'BB',
  pf2e_aoa1: 'AoA1',
  pf2e_aoa2: 'AoA2',
  pf2e_aoa3: 'AoA3',
  pf2e_aoa4: 'AoA4',
  pf2e_aoa5: 'AoA5',
  pf2e_aoa6: 'AoA6',
  pf2e_av1: 'AV1',
  pf2e_av2: 'AV2',
  pf2e_av3: 'AV3',
  pf2e_ec1: 'EC1',
  pf2e_ec2: 'EC2',
  pf2e_ec3: 'EC3',
  pf2e_ec4: 'EC4',
  pf2e_ec5: 'EC5',
  pf2e_ec6: 'EC6',
  pf2e_gw1: 'GW1',
  pf2e_gw2: 'GW2',
  pf2e_gw3: 'GW3',
  pf2e_gmg: 'GMG',
  pf2e_som: 'SoM',
  pf2e_apg: 'APG',
  pf2e_lol: 'LoL',
  pf2e_da: 'DA',
  pf2e_botd: 'BotD',
  'custom-pf2e': 'Custom',
};

export default PF2E_SOURCE_BADGES;
```

Note: This is a starter set. The actual full list will be populated when the converter runs against all 129 files. The source filter dropdown is dynamically built from the `/sources` API endpoint, so missing badge entries just fall back to displaying the raw sourceKey.

- [ ] **Step 2: Commit**

```bash
git add client/src/constants/pf2eSources.js
git commit -m "feat(pf2e): add PF2e source badge constants"
```

---

## Task 10: LeftPanel — 4 Tabs

**Files:**
- Modify: `client/src/components/tracker/LeftPanel.jsx`

- [ ] **Step 1: Update to 4 tabs with `gameSystem` prop on MonsterDatabase**

```jsx
// client/src/components/tracker/LeftPanel.jsx
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import MonsterDatabase from './MonsterDatabase';
import CharacterLibrary from './CharacterLibrary';
import EncounterLibrary from './EncounterLibrary';

const TABS = [
  { id: '5e', label: '5E' },
  { id: 'pf2e', label: 'PF2E' },
  { id: 'characters', label: 'Characters' },
  { id: 'encounters', label: 'Encounters' },
];

const LeftPanel = forwardRef(function LeftPanel({ onRollDice, onAddToEncounter }, ref) {
  const [activeTab, setActiveTab] = useState('5e');
  const monsterDbRef5e = useRef(null);
  const monsterDbRefPf2e = useRef(null);

  useImperativeHandle(ref, () => ({
    showStatBlock(slug) {
      // Determine which tab based on slug prefix
      if (slug.startsWith('pf2e_')) {
        setActiveTab('pf2e');
        monsterDbRefPf2e.current?.showStatBlock(slug);
      } else {
        setActiveTab('5e');
        monsterDbRef5e.current?.showStatBlock(slug);
      }
    },
  }), []);

  return (
    <div className="left-panel">
      <div className="left-panel__tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`left-panel__tab${activeTab === tab.id ? ' left-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="left-panel__content">
        {activeTab === '5e' && (
          <MonsterDatabase ref={monsterDbRef5e} gameSystem="5e" onRollDice={onRollDice} onAddToEncounter={onAddToEncounter} />
        )}
        {activeTab === 'pf2e' && (
          <MonsterDatabase ref={monsterDbRefPf2e} gameSystem="pf2e" onRollDice={onRollDice} onAddToEncounter={onAddToEncounter} />
        )}
        {activeTab === 'characters' && <CharacterLibrary />}
        {activeTab === 'encounters' && <EncounterLibrary />}
      </div>
    </div>
  );
});

export default LeftPanel;
```

Changes:
1. Renamed tabs: `monsters` → `5e`, added `pf2e`
2. Tab labels: `"5E"`, `"PF2E"`, `"Characters"`, `"Encounters"`
3. Default active tab: `'5e'`
4. Two MonsterDatabase refs — one for each system
5. `showStatBlock` detects PF2e slugs by `pf2e_` prefix
6. Each MonsterDatabase gets a `gameSystem` prop

- [ ] **Step 2: Verify the page loads**

Run: `npm run dev:client`
Navigate to `/tracker`
Expected: 4 tabs visible: 5E, PF2E, Characters, Encounters

- [ ] **Step 3: Commit**

```bash
git add client/src/components/tracker/LeftPanel.jsx
git commit -m "feat(pf2e): update left panel to 4 tabs with gameSystem routing"
```

---

## Task 11: MonsterDatabase — Accept `gameSystem` Prop

**Files:**
- Modify: `client/src/components/tracker/MonsterDatabase.jsx`
- Read: `client/src/constants/pf2eSources.js` (from Task 9)

This is the largest UI change. MonsterDatabase needs to:
1. Accept a `gameSystem` prop
2. Pass it to all API hooks
3. Use the right source badge mapping
4. Show "Level" instead of "CR" labels when PF2e
5. Use level options instead of CR fraction options

- [ ] **Step 1: Update MonsterDatabase to be game-system-aware**

Key changes to `client/src/components/tracker/MonsterDatabase.jsx`:

**At the top**, add the PF2e imports and constants:

```jsx
import SOURCE_BADGES from '../../constants/monsterSources';
import PF2E_SOURCE_BADGES from '../../constants/pf2eSources';

// 5e CR options (fractions)
const CR_OPTIONS_5E = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
  '24', '25', '26', '27', '28', '29', '30',
];

// PF2e Level options (integers -1 to 25)
const LEVEL_OPTIONS_PF2E = [
  '-1', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25',
];
```

**Remove** the old `CR_OPTIONS` constant (lines 10-14).

**Update the component signature** to accept `gameSystem`:

```jsx
const MonsterDatabase = forwardRef(function MonsterDatabase({ gameSystem = '5e', onRollDice, onAddToEncounter }, ref) {
```

**Inside the component**, add game-system-aware variables:

```jsx
  const isPf2e = gameSystem === 'pf2e';
  const sourceBadges = isPf2e ? PF2E_SOURCE_BADGES : SOURCE_BADGES;
  const crLevelOptions = isPf2e ? LEVEL_OPTIONS_PF2E : CR_OPTIONS_5E;
  const crLabel = isPf2e ? 'Level' : 'CR';
  const crAllLabel = isPf2e ? 'All Levels' : 'All CRs';
```

**Update the `useMonsterBrowse` call** to pass `gameSystem`:

```jsx
  const { data, isLoading } = useMonsterBrowse({
    q: debouncedQuery,
    source: sourceFilter,
    cr: crFilter,
    gameSystem,
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });
```

**Update the `useMonsterSources` call** to pass `gameSystem`:

```jsx
  const { data: sources = [] } = useMonsterSources(gameSystem);
```

**Update custom monsters filtering** to respect `gameSystem`:

```jsx
  const localMonsters = (!sourceFilter || sourceFilter === 'custom' || sourceFilter === 'custom-pf2e')
    ? storeMonsters.filter(m => {
        // Filter by game system
        const monsterSystem = m.gameSystem || '5e';
        if (monsterSystem !== gameSystem) return false;
        if (debouncedQuery) {
          const pattern = new RegExp(debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (!pattern.test(m.name)) return false;
        }
        if (crFilter && m.cr !== crFilter) return false;
        return true;
      }).sort((a, b) => a.name.localeCompare(b.name))
    : [];
```

**Update the filter dropdowns** to use game-system-aware labels:

```jsx
          <select
            className="monster-db__select"
            value={crFilter}
            onChange={e => handleCrFilter(e.target.value)}
          >
            <option value="">{crAllLabel}</option>
            {crLevelOptions.map(val => (
              <option key={val} value={val}>{crLabel} {val}</option>
            ))}
          </select>
```

**Update the Create and Import buttons** to pass `gameSystem`:

```jsx
      <div className="monster-db__custom-actions">
        <button
          className="btn btn--sm btn--primary"
          onClick={() => openModal('monster-form', { gameSystem })}
        >
          + Create {isPf2e ? 'Creature' : 'Monster'}
        </button>
        <button
          className="btn btn--sm"
          onClick={() => openModal('import-monster', { gameSystem })}
        >
          &#8595; Import JSON
        </button>
      </div>
```

**Update the monster result item** to show Level vs CR:

```jsx
              <span className="monster-db__stat" title={isPf2e ? 'Level' : 'Challenge Rating'}>
                {isPf2e ? `Lvl ${m.cr || '—'}` : `CR ${m.cr || '—'}`}
              </span>
```

**Update the source badge** to use the correct mapping:

```jsx
              <span className="monster-search__source-badge">
                {sourceBadges[m.sourceKey] || m.sourceKey}
              </span>
```

- [ ] **Step 2: Verify the client builds**

Run: `cd client && npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add client/src/components/tracker/MonsterDatabase.jsx
git commit -m "feat(pf2e): make MonsterDatabase game-system-aware with Level/CR toggle"
```

---

## Task 12: MonsterFormModal — Game-System-Aware Form

**Files:**
- Modify: `client/src/components/monsters/MonsterFormModal.jsx`
- Modify: `client/src/utils/monsterFormHelpers.js`

The form needs to show different fields based on `gameSystem`:
- PF2e: Level (number 1-25) instead of CR dropdown, Perception modifier, ability modifier inputs (-5 to +10), Fort/Ref/Will saves
- 5e: Existing form unchanged

- [ ] **Step 1: Add PF2e helpers to monsterFormHelpers.js**

Add these exports to the end of `client/src/utils/monsterFormHelpers.js`:

```js
// ── PF2e-specific constants ──

export const PF2E_LEVEL_RANGE = { min: -1, max: 25 };

export const PF2E_RARITY_OPTIONS = ['Common', 'Uncommon', 'Rare', 'Unique'];

export const PF2E_SIZE_OPTIONS = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

/** Default form state for a new PF2e creature */
export function getDefaultPf2eFormData() {
  return {
    name: '',
    level: 1,
    size: 'Medium',
    type: '', // Creature type traits (free text)
    rarity: 'Common',
    perception: 0,
    ac: 15,
    acDesc: '',
    hp: 10,
    fort: 0,
    ref: 0,
    will: 0,
    speed: '25 feet',
    abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, // PF2e stores modifiers
    skills: '',
    senses: '',
    languages: '',
    immunities: '',
    resistances: '',
    weaknesses: '',
    traits: [],
    actions: [],
    reactions: [],
    rawMarkdown: '',
  };
}

/** Convert PF2e form data to the API payload format */
export function pf2eFormDataToMonsterAPI(formData) {
  const payload = {
    name: formData.name,
    size: formData.size,
    type: formData.type || 'Creature',
    alignment: '', // PF2e doesn't use alignment
    cr: String(formData.level),
    hp: formData.hp,
    ac: formData.ac,
    acDesc: formData.acDesc || '',
    initMod: formData.perception, // PF2e uses Perception for initiative
    abilities: formData.abilities,
    speed: formData.speed,
    gameSystem: 'pf2e',
    rawMarkdown: formData.rawMarkdown || buildPf2eMarkdownFromForm(formData),
  };
  // Remove empty arrays
  if (formData.traits?.length > 0) payload.traits = formData.traits;
  if (formData.actions?.length > 0) payload.actions = formData.actions;
  if (formData.reactions?.length > 0) payload.reactions = formData.reactions;
  return payload;
}

/** Build a simple PF2e markdown stat block from form data */
function buildPf2eMarkdownFromForm(f) {
  const mod = (n) => n >= 0 ? `+${n}` : String(n);
  const lines = [];
  lines.push(`# ${f.name}`);
  lines.push(`*Creature ${f.level}*`);
  lines.push('');
  const traitParts = [f.rarity, f.size, f.type].filter(Boolean);
  if (traitParts.length) lines.push(traitParts.join(', '));
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**Perception** ${mod(f.perception)}${f.senses ? '; ' + f.senses : ''}`);
  if (f.languages) lines.push(`**Languages** ${f.languages}`);
  if (f.skills) lines.push(`**Skills** ${f.skills}`);
  const a = f.abilities;
  lines.push(`**STR** ${mod(a.str)}, **DEX** ${mod(a.dex)}, **CON** ${mod(a.con)}, **INT** ${mod(a.int)}, **WIS** ${mod(a.wis)}, **CHA** ${mod(a.cha)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**AC** ${f.ac}${f.acDesc ? ' (' + f.acDesc + ')' : ''}`);
  lines.push(`**Fort** ${mod(f.fort)}, **Ref** ${mod(f.ref)}, **Will** ${mod(f.will)}`);
  lines.push(`**HP** ${f.hp}`);
  if (f.immunities) lines.push(`**Immunities** ${f.immunities}`);
  if (f.resistances) lines.push(`**Resistances** ${f.resistances}`);
  if (f.weaknesses) lines.push(`**Weaknesses** ${f.weaknesses}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**Speed** ${f.speed}`);
  if (f.actions?.length > 0) {
    for (const a of f.actions) {
      lines.push(`**${a.name}** ${a.description}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}
```

- [ ] **Step 2: Update MonsterFormModal to support PF2e**

Add PF2e-aware branching to `MonsterFormModal.jsx`. The key changes:

**Update imports:**

```jsx
import {
  SIZE_OPTIONS, TYPE_OPTIONS, ALIGNMENT_OPTIONS, CR_OPTIONS,
  ABILITY_NAMES, ABILITY_LABELS, formatModifier,
  getDefaultFormData, formDataToMonsterAPI,
  PF2E_SIZE_OPTIONS, PF2E_RARITY_OPTIONS, PF2E_LEVEL_RANGE,
  getDefaultPf2eFormData, pf2eFormDataToMonsterAPI,
} from '../../utils/monsterFormHelpers';
```

**In the component body**, detect `gameSystem` from the modal data:

```jsx
  const modalData = useUIStore(s => s.modalData);
  const gameSystem = modalData?.gameSystem || editMonster?.gameSystem || '5e';
  const isPf2e = gameSystem === 'pf2e';
```

**Update the default form state initialization:**

```jsx
  const [form, setForm] = useState(() => {
    if (mergedEdit) return mergedEdit;
    return isPf2e ? getDefaultPf2eFormData() : getDefaultFormData();
  });
```

**Add a PF2e ability modifier updater** (alongside the existing `updateAbility`):

```jsx
  function updateAbilityMod(stat, value) {
    const num = Math.max(-5, Math.min(10, parseInt(value) || 0));
    setForm(prev => ({ ...prev, abilities: { ...prev.abilities, [stat]: num } }));
  }
```

**Update the save handler** to use the right converter:

```jsx
  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = isPf2e ? pf2eFormDataToMonsterAPI(form) : formDataToMonsterAPI(form);
      if (isEdit && editMonster?.slug) {
        updateCustomMonster(editMonster.slug, payload);
      } else {
        addCustomMonster(payload);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Save failed');
      setSaving(false);
    }
  }, [form, isPf2e, isEdit, editMonster, addCustomMonster, updateCustomMonster, closeModal]);
```

**Replace the Basics section** with game-system-aware fields:

```jsx
        <Section title="Basics" id="basics" open={openSections.basics} onToggle={toggleSection}>
          <div className="monster-form__row">
            <label className="monster-form__field monster-form__field--wide">
              <span>Name *</span>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} maxLength={100} />
            </label>
            {isPf2e ? (
              <label className="monster-form__field">
                <span>Level</span>
                <input type="number" min={PF2E_LEVEL_RANGE.min} max={PF2E_LEVEL_RANGE.max}
                  value={form.level} onChange={e => update('level', parseInt(e.target.value) || 0)} />
              </label>
            ) : (
              <label className="monster-form__field">
                <span>CR</span>
                <select value={form.cr} onChange={e => update('cr', e.target.value)}>
                  {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>Size</span>
              <select value={form.size} onChange={e => update('size', e.target.value)}>
                {(isPf2e ? PF2E_SIZE_OPTIONS : SIZE_OPTIONS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {isPf2e ? (
              <>
                <label className="monster-form__field">
                  <span>Creature Type / Traits</span>
                  <input type="text" value={form.type} onChange={e => update('type', e.target.value)} placeholder="e.g. Humanoid, Beast" />
                </label>
                <label className="monster-form__field">
                  <span>Rarity</span>
                  <select value={form.rarity} onChange={e => update('rarity', e.target.value)}>
                    {PF2E_RARITY_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="monster-form__field">
                  <span>Type</span>
                  <select value={form.type} onChange={e => update('type', e.target.value)}>
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="monster-form__field">
                  <span>Alignment</span>
                  <select value={form.alignment} onChange={e => update('alignment', e.target.value)}>
                    <option value="">None</option>
                    {ALIGNMENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>AC</span>
              <input type="number" min={0} max={99} value={form.ac} onChange={e => update('ac', parseInt(e.target.value) || 0)} />
            </label>
            <label className="monster-form__field">
              <span>AC Description</span>
              <input type="text" value={form.acDesc} onChange={e => update('acDesc', e.target.value)} placeholder="e.g. natural armor" />
            </label>
            <label className="monster-form__field">
              <span>HP</span>
              <input type="number" min={1} value={form.hp} onChange={e => update('hp', parseInt(e.target.value) || 1)} />
            </label>
            {!isPf2e && (
              <label className="monster-form__field">
                <span>HP Formula</span>
                <input type="text" value={form.hpFormula} onChange={e => update('hpFormula', e.target.value)} placeholder="e.g. 6d8+18" />
              </label>
            )}
          </div>
          <label className="monster-form__field monster-form__field--full">
            <span>Speed</span>
            <input type="text" value={form.speed} onChange={e => update('speed', e.target.value)} placeholder={isPf2e ? '25 feet, fly 40 feet' : '30 ft., fly 60 ft.'} />
          </label>
          {isPf2e && (
            <label className="monster-form__field monster-form__field--full">
              <span>Perception</span>
              <input type="number" min={-10} max={40} value={form.perception} onChange={e => update('perception', parseInt(e.target.value) || 0)} />
            </label>
          )}
        </Section>
```

**Replace the Ability Scores section** with game-system-aware inputs:

```jsx
        <Section title={isPf2e ? 'Ability Modifiers' : 'Ability Scores'} id="abilities" open={openSections.abilities} onToggle={toggleSection}>
          <div className="monster-form__abilities">
            {ABILITY_NAMES.map(stat => (
              <label key={stat} className="monster-form__ability">
                <span className="monster-form__ability-label">{ABILITY_LABELS[stat]}</span>
                {isPf2e ? (
                  <>
                    <input
                      type="number" min={-5} max={10}
                      value={form.abilities[stat]}
                      onChange={e => updateAbilityMod(stat, e.target.value)}
                    />
                    <span className="monster-form__ability-mod">{form.abilities[stat] >= 0 ? '+' : ''}{form.abilities[stat]}</span>
                  </>
                ) : (
                  <>
                    <input
                      type="number" min={1} max={30}
                      value={form.abilities[stat]}
                      onChange={e => updateAbility(stat, e.target.value)}
                    />
                    <span className="monster-form__ability-mod">{formatModifier(form.abilities[stat])}</span>
                  </>
                )}
              </label>
            ))}
          </div>
        </Section>
```

**For PF2e, add Fort/Ref/Will** to the Defenses section (add before existing saving throws field):

```jsx
        <Section title="Defenses &amp; Senses" id="defenses" open={openSections.defenses} onToggle={toggleSection}>
          {isPf2e && (
            <div className="monster-form__row">
              <label className="monster-form__field">
                <span>Fort</span>
                <input type="number" min={-10} max={40} value={form.fort} onChange={e => update('fort', parseInt(e.target.value) || 0)} />
              </label>
              <label className="monster-form__field">
                <span>Ref</span>
                <input type="number" min={-10} max={40} value={form.ref} onChange={e => update('ref', parseInt(e.target.value) || 0)} />
              </label>
              <label className="monster-form__field">
                <span>Will</span>
                <input type="number" min={-10} max={40} value={form.will} onChange={e => update('will', parseInt(e.target.value) || 0)} />
              </label>
            </div>
          )}
          {/* ... rest of existing defenses section unchanged ... */}
```

- [ ] **Step 3: Verify the client builds**

Run: `cd client && npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add client/src/components/monsters/MonsterFormModal.jsx client/src/utils/monsterFormHelpers.js
git commit -m "feat(pf2e): add game-system-aware monster creation form with PF2e fields"
```

---

## Task 13: ImportMonsterModal — PF2e JSON Import

**Files:**
- Modify: `client/src/components/monsters/ImportMonsterModal.jsx`
- Modify: `client/src/utils/monsterImport.js`

The import modal needs a game system toggle and a PF2e JSON parser path that uses the shared renderer.

- [ ] **Step 1: Add PF2e parsing to monsterImport.js**

Add to the top of `client/src/utils/monsterImport.js`:

```js
import { renderPf2eCreatureToMarkdown } from '../../../shared/pf2eMarkdownRenderer.js';
import { stripPf2eTags } from '../../../shared/pf2eTagStripper.js';
```

> **Note:** The `../../../shared/` import goes outside `client/src/`. Vite handles relative imports outside the project root by default. If it fails, add an alias in `vite.config.js`: `resolve: { alias: { '@shared': path.resolve(__dirname, '../shared') } }` and change imports to `@shared/pf2eMarkdownRenderer.js`.

Add a new exported function after `parseMonsterJSON`:

```js
/**
 * Parse PF2eTools creature JSON and normalize to our API shape.
 * Accepts either a raw creature object or { creature: [...] } wrapper.
 */
export function parsePf2eMonsterJSON(jsonText) {
  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON — check for syntax errors.');
  }

  // PF2eTools wraps creatures in { creature: [...] }
  if (raw.creature && Array.isArray(raw.creature)) {
    if (raw.creature.length === 0) throw new Error('No creatures found in PF2eTools data.');
    raw = raw.creature[0];
  }

  return normalizePf2eCreature(raw);
}

/**
 * Normalize a PF2eTools creature JSON to our custom monster API shape.
 */
function normalizePf2eCreature(raw) {
  const monster = {};

  monster.name = stripPf2eTags(raw.name || '');
  monster.gameSystem = 'pf2e';
  monster.size = normalizeSize(Array.isArray(raw.traits) ?
    raw.traits.find(t => ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].includes(t)) || 'Medium' :
    'Medium');
  monster.type = Array.isArray(raw.traits) ? raw.traits.filter(t =>
    !['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'N', 'NG', 'NE', 'CG', 'CE', 'LG', 'LE', 'LN', 'CN',
      'Common', 'Uncommon', 'Rare', 'Unique'].includes(t)
  ).join(', ') : '';
  monster.alignment = '';
  monster.cr = String(raw.level || 0);
  monster.hp = raw.defenses?.hp?.[0]?.hp || 1;
  monster.ac = raw.defenses?.ac?.std || 10;
  monster.acDesc = '';
  monster.initMod = raw.perception?.std || 0;
  monster.speed = formatPf2eSpeed(raw.speed);

  // Ability modifiers (PF2e stores modifiers, not scores)
  if (raw.abilityMods) {
    monster.abilities = { ...raw.abilityMods };
  } else {
    monster.abilities = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  }

  // Text fields
  monster.senses = (raw.perception?.senses || []).map(s => stripPf2eTags(typeof s === 'string' ? s : s.name || '')).join(', ');
  monster.languages = (raw.languages?.languages || []).map(l => stripPf2eTags(typeof l === 'string' ? l : l.name || '')).join(', ');
  monster.savingThrows = `Fort ${formatModField(raw.defenses?.savingThrows?.fort?.std)}, Ref ${formatModField(raw.defenses?.savingThrows?.ref?.std)}, Will ${formatModField(raw.defenses?.savingThrows?.will?.std)}`;
  monster.skills = (raw.skills || []).map(s => `${stripPf2eTags(s.name)} ${formatModField(s.std)}`).join(', ');
  monster.damageResistances = (raw.defenses?.resistances || []).map(r => `${stripPf2eTags(r.name || '')} ${r.amount || ''}`).join(', ');
  monster.damageImmunities = (raw.defenses?.immunities || []).map(i => stripPf2eTags(typeof i === 'string' ? i : i.name || '')).join(', ');
  monster.damageVulnerabilities = (raw.defenses?.weaknesses || []).map(w => `${stripPf2eTags(w.name || '')} ${w.amount || ''}`).join(', ');
  monster.conditionImmunities = '';

  // Generate rawMarkdown from the full creature JSON
  try {
    monster.rawMarkdown = renderPf2eCreatureToMarkdown(raw);
  } catch {
    monster.rawMarkdown = '';
  }

  // Simplified action entries
  monster.traits = [];
  monster.actions = [];
  monster.reactions = [];
  monster.legendaryActions = [];

  return monster;
}

function formatPf2eSpeed(speed) {
  if (!speed) return '25 feet';
  const parts = [];
  if (speed.walk) parts.push(`${speed.walk} feet`);
  for (const [mode, val] of Object.entries(speed)) {
    if (mode === 'walk' || mode === 'abilities' || mode === 'speedNote') continue;
    if (typeof val === 'number') parts.push(`${mode} ${val} feet`);
  }
  return parts.join(', ') || '25 feet';
}

function formatModField(n) {
  if (n === undefined || n === null) return '+0';
  return n >= 0 ? `+${n}` : String(n);
}
```

Also add a PF2e validation function:

```js
/**
 * Validate a normalized PF2e monster. Returns an array of error strings.
 */
export function validatePf2eMonsterData(data) {
  const errors = [];

  if (!data.name || !data.name.trim()) {
    errors.push('Name is required.');
  } else if (data.name.length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }

  if (typeof data.hp !== 'number' || data.hp < 1) {
    errors.push('HP must be at least 1.');
  }

  if (typeof data.ac !== 'number' || data.ac < 0 || data.ac > 99) {
    errors.push('AC must be a number between 0 and 99.');
  }

  if (data.rawMarkdown && data.rawMarkdown.length > 50000) {
    errors.push('Raw markdown must be 50,000 characters or fewer.');
  }

  return errors;
}
```

- [ ] **Step 2: Update ImportMonsterModal to support PF2e**

In `client/src/components/monsters/ImportMonsterModal.jsx`, add the PF2e import path:

**Update imports:**

```jsx
import { parseMonsterJSON, validateMonsterData, MONSTER_JSON_TEMPLATE, parsePf2eMonsterJSON, validatePf2eMonsterData } from '../../utils/monsterImport';
```

**Add gameSystem state** (read from modal data or default to '5e'):

```jsx
  const modalData = useUIStore(s => s.modalData);
  const [gameSystem, setGameSystem] = useState(modalData?.gameSystem || '5e');
  const isPf2e = gameSystem === 'pf2e';
```

**Update `handleParse`** to use the right parser:

```jsx
  function handleParse(text) {
    setErrors([]);
    setParsed(null);
    try {
      const monster = isPf2e ? parsePf2eMonsterJSON(text) : parseMonsterJSON(text);
      const validationErrors = isPf2e ? validatePf2eMonsterData(monster) : validateMonsterData(monster);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      setParsed(monster);
    } catch (err) {
      setErrors([err.message]);
    }
  }
```

**Add a game system toggle** at the top of the modal content (before the tab selector):

```jsx
        {/* Game system toggle */}
        <div className="import-monster__system-toggle">
          <button
            className={`import-monster__system-btn ${!isPf2e ? 'import-monster__system-btn--active' : ''}`}
            onClick={() => { setGameSystem('5e'); reset(); }}
          >
            D&amp;D 5E
          </button>
          <button
            className={`import-monster__system-btn ${isPf2e ? 'import-monster__system-btn--active' : ''}`}
            onClick={() => { setGameSystem('pf2e'); reset(); }}
          >
            PF2E
          </button>
        </div>
```

**Update the textarea placeholder:**

```jsx
            <textarea
              className="import-monster__textarea"
              placeholder={isPf2e ? 'Paste PF2eTools creature JSON here...' : 'Paste 5e monster JSON here...'}
```

**Update the preview** to show Level instead of CR for PF2e:

```jsx
              <div><strong>{isPf2e ? 'Level' : 'CR'}:</strong> {parsed.cr}</div>
```

- [ ] **Step 3: Verify the client builds**

Run: `cd client && npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add client/src/components/monsters/ImportMonsterModal.jsx client/src/utils/monsterImport.js
git commit -m "feat(pf2e): add PF2e JSON import with shared renderer and validation"
```

---

## Task 14: Run Converter, Generate Markdown, Seed

This task is a manual integration step — run the converter against PF2eTools data, verify output, and seed the database.

- [ ] **Step 1: Clone PF2eTools bestiary data**

```bash
# From repo root — clone just the bestiary data temporarily
git clone --depth 1 --filter=blob:none --sparse https://github.com/Pf2eToolsOrg/Pf2eTools.git temp_pf2etools
cd temp_pf2etools
git sparse-checkout set data/bestiary
cd ..
```

- [ ] **Step 2: Run the converter**

```bash
node scripts/convertPf2eToMarkdown.js temp_pf2etools/data/bestiary
```

Expected: Console output showing N creatures converted across M source folders, written to `Monsters/pf2e_*/` directories.

- [ ] **Step 3: Verify sample output**

```bash
# Check a simple creature
cat Monsters/pf2e_b1/air-mephit.md

# Check a complex creature
cat Monsters/pf2e_b1/ancient-blue-dragon.md

# Count total files
find Monsters/pf2e_* -name "*.md" | wc -l
```

Expected: Markdown files with proper headers, traits, abilities, attacks.

- [ ] **Step 4: Clean up temporary clone**

```bash
rm -rf temp_pf2etools
```

- [ ] **Step 5: Run the seed script**

```bash
npm run seed:monsters
```

Expected: Seed script processes both 5e AND PF2e folders, upserting all creatures with correct `gameSystem` values.

- [ ] **Step 6: Commit generated markdown files**

```bash
git add Monsters/pf2e_*/
git commit -m "data(pf2e): add generated PF2e creature markdown files from PF2eTools"
```

---

## Task 15: Integration Testing & Polish

- [ ] **Step 1: Verify lint passes**

```bash
cd client && npx vite build
cd ../server && npx eslint .
```

Expected: No errors

- [ ] **Step 2: Manual verification checklist**

Start the dev server (`npm run dev`) and verify:

1. **4 tabs visible**: 5E, PF2E, Characters, Encounters
2. **5E tab**: Shows only 5e creatures, CR filter, source filter (existing 5e sources only)
3. **PF2E tab**: Shows only PF2e creatures, Level filter, source filter (PF2e sources only)
4. **Search**: Works independently per tab
5. **Stat block viewer**: Click a PF2e creature → markdown renders with Level, Fort/Ref/Will, action symbols
6. **Create button on PF2e tab**: Opens form with Level, Perception, ability modifiers, Fort/Ref/Will
7. **Import on PF2e tab**: Shows game system toggle, accepts PF2eTools JSON, renders preview with Level
8. **5E tab unchanged**: All existing 5e functionality works exactly as before
9. **Clicking creature name in tracker**: Routes to correct tab (5E or PF2E) based on slug prefix

- [ ] **Step 3: Fix any issues found during manual testing**

Address any bugs discovered during the checklist above.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(pf2e): integration fixes and polish"
```

---

## Task Summary

| Task | Description | Estimated Complexity |
|------|-------------|---------------------|
| 1 | PF2e Template Tag Stripper | Low — pure function, no deps |
| 2 | PF2e Markdown Renderer | High — complex JSON → markdown with many edge cases |
| 3 | Converter Script | Medium — CLI wrapper around renderer |
| 4 | Monster Model `gameSystem` | Low — one field, one index |
| 5 | Seed Script PF2e Parser | Medium — new parser function, auto-detect folders |
| 6 | API Routes `gameSystem` Filter | Medium — 3 route changes + validator |
| 7 | UserData Validator | Low — one field addition |
| 8 | Client API Hooks | Low — pass-through param |
| 9 | PF2e Source Constants | Low — static mapping |
| 10 | LeftPanel 4 Tabs | Low — tab array + routing |
| 11 | MonsterDatabase `gameSystem` | High — many conditional UI elements |
| 12 | MonsterFormModal PF2e | High — conditional form fields, new helpers |
| 13 | ImportMonsterModal PF2e | High — new parser path, shared renderer integration |
| 14 | Run Converter + Seed | Medium — manual integration step |
| 15 | Integration Testing | Medium — verify full flow end-to-end |
