// shared/pf2eMarkdownRenderer.js

import { stripPf2eTags } from './pf2eTagStripper.js';

// Action cost symbols
const ACTION_SYMBOLS = {
  free: '\u25C7',      // ◇
  1: '\u25C6',         // ◆
  2: '\u25C6\u25C6',   // ◆◆
  3: '\u25C6\u25C6\u25C6', // ◆◆◆
};

/**
 * Format a numeric modifier as +N or -N (never bare N).
 * @param {number} n
 * @returns {string}
 */
function fmtMod(n) {
  if (n === undefined || n === null) return '+0';
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Resolve action cost symbols from an activity descriptor.
 * @param {{ unit: string, number?: number } | undefined} activity
 * @returns {string}
 */
function resolveActivity(activity) {
  if (!activity) return '';
  if (activity.unit === 'free') return ACTION_SYMBOLS.free;
  if (activity.unit === 'reaction') return '\u25C8'; // ◈
  if (activity.unit === 'action' || activity.unit === 'actions') {
    const count = activity.number ?? 1;
    return ACTION_SYMBOLS[count] ?? '\u25C6'.repeat(count);
  }
  return '';
}

/**
 * Render a single ability entry (top, mid, or bot ability block).
 * @param {object} ability
 * @returns {string}
 */
function renderAbility(ability) {
  const parts = [];

  // Name + action symbol
  const actionStr = resolveActivity(ability.activity);
  const nameStr = `**${ability.name}**${actionStr ? ` ${actionStr}` : ''}`;

  // Traits in parens
  const traits = ability.traits ?? [];
  const traitStr = traits.length > 0 ? ` (${traits.join(', ')})` : '';

  parts.push(`${nameStr}${traitStr}`);

  // Special fields
  if (ability.trigger) {
    parts.push(`**Trigger** ${stripPf2eTags(ability.trigger)};`);
  }
  if (ability.frequency) {
    const freqText =
      typeof ability.frequency === 'string'
        ? ability.frequency
        : ability.frequency.entry ?? JSON.stringify(ability.frequency);
    parts.push(`**Frequency** ${stripPf2eTags(freqText)};`);
  }
  if (ability.requirements) {
    parts.push(`**Requirements** ${stripPf2eTags(ability.requirements)};`);
  }

  // Entries
  const entries = ability.entries ?? [];
  const entryLines = entries.map((entry) => renderEntry(entry));
  parts.push(...entryLines);

  return parts.join(' ');
}

/**
 * Render a single entry value (string, list object, successDegree object, etc.)
 * @param {string|object} entry
 * @returns {string}
 */
function renderEntry(entry) {
  if (typeof entry === 'string') {
    return stripPf2eTags(entry);
  }
  if (typeof entry !== 'object' || entry === null) return '';

  if (entry.type === 'list') {
    const items = (entry.items ?? []).map((item) => `- ${stripPf2eTags(typeof item === 'string' ? item : item.entry ?? '')}`);
    return items.join('\n');
  }

  if (entry.type === 'successDegree') {
    const degrees = ['Critical Success', 'Success', 'Failure', 'Critical Failure'];
    const lines = degrees
      .filter((d) => entry.entries?.[d])
      .map((d) => `**${d}** ${stripPf2eTags(entry.entries[d])}`);
    return lines.join('\n');
  }

  // Generic object with an 'entry' field
  if (entry.entry) return stripPf2eTags(entry.entry);

  // Fallback: try name + entries
  if (entry.name && entry.entries) {
    return `**${entry.name}** ${entry.entries.map(renderEntry).join(' ')}`;
  }

  return '';
}

/**
 * Render speed block.
 * @param {{ walk?: number, fly?: number, burrow?: number, swim?: number, climb?: number }} speed
 * @returns {string}
 */
function renderSpeed(speed) {
  if (!speed) return '';
  const parts = [];
  if (speed.walk != null) parts.push(`${speed.walk} feet`);
  if (speed.fly != null) parts.push(`fly ${speed.fly} feet`);
  if (speed.burrow != null) parts.push(`burrow ${speed.burrow} feet`);
  if (speed.swim != null) parts.push(`swim ${speed.swim} feet`);
  if (speed.climb != null) parts.push(`climb ${speed.climb} feet`);
  // Handle any other speed types
  const known = new Set(['walk', 'fly', 'burrow', 'swim', 'climb', 'abilities', 'notes']);
  for (const [key, val] of Object.entries(speed)) {
    if (!known.has(key) && typeof val === 'number') {
      parts.push(`${key} ${val} feet`);
    }
  }
  return parts.length > 0 ? `Speed ${parts.join(', ')}` : '';
}

/**
 * Render HP block from the hp array.
 * @param {Array<{ hp: number, name?: string, abilities?: string[], notes?: string }>} hpArr
 * @returns {string}
 */
function renderHp(hpArr) {
  if (!hpArr || hpArr.length === 0) return '**HP** —';
  const pools = hpArr.map((pool) => {
    let str = `${pool.hp}`;
    if (pool.name) str = `${str} (${pool.name})`;
    if (pool.abilities && pool.abilities.length > 0) {
      str = `${str}; ${pool.abilities.map(stripPf2eTags).join(', ')}`;
    }
    return str;
  });
  return `**HP** ${pools.join(', ')}`;
}

/**
 * Render AC block, including variant ACs.
 * @param {{ std: number, [key: string]: number }} ac
 * @returns {string}
 */
function renderAc(ac) {
  if (!ac) return '**AC** —';
  const variants = Object.entries(ac)
    .filter(([key]) => key !== 'std')
    .map(([key, val]) => `${val} ${key}`);
  const base = `**AC** ${ac.std}`;
  return variants.length > 0 ? `${base}; ${variants.join(', ')}` : base;
}

/**
 * Render saving throws line.
 * @param {{ fort: { std: number }, ref: { std: number }, will: { std: number } }} savingThrows
 * @param {string[]} [saveAbilities]
 * @returns {string}
 */
function renderSaves(savingThrows, saveAbilities) {
  if (!savingThrows) return '';
  const fort = fmtMod(savingThrows.fort?.std);
  const ref = fmtMod(savingThrows.ref?.std);
  const will = fmtMod(savingThrows.will?.std);
  let line = `**Fort** ${fort}, **Ref** ${ref}, **Will** ${will}`;
  if (saveAbilities && saveAbilities.length > 0) {
    line += `; ${saveAbilities.map(stripPf2eTags).join(', ')}`;
  }
  return line;
}

/**
 * Render a single attack line.
 * @param {object} attack
 * @returns {string}
 */
function renderAttack(attack) {
  const type = attack.type === 'ranged' ? '**Ranged**' : '**Melee**';
  const mod = fmtMod(attack.attack);
  const traits = attack.traits && attack.traits.length > 0 ? ` (${attack.traits.join(', ')})` : '';
  const damage = attack.damage ? ` **Damage** ${stripPf2eTags(attack.damage)}` : '';
  const effects = attack.effects && attack.effects.length > 0 ? ` plus ${attack.effects.map(stripPf2eTags).join(', ')}` : '';
  return `${type} ${attack.name} ${mod}${traits};${damage}${effects}`;
}

/**
 * Render spellcasting block(s).
 * @param {Array<object>} spellcastingArr
 * @returns {string}
 */
function renderSpellcasting(spellcastingArr) {
  if (!spellcastingArr || spellcastingArr.length === 0) return '';

  const blocks = spellcastingArr.map((block) => {
    const lines = [];
    const tradition = block.tradition ? ` ${block.tradition}` : '';
    const type = block.type ?? 'Spontaneous';
    const dcStr = block.DC ? ` (DC ${block.DC})` : '';
    const attackStr = block.attack != null ? `, attack ${fmtMod(block.attack)}` : '';
    lines.push(`**${block.name ?? `${type}${tradition} Spells`}**${dcStr}${attackStr}`);

    // Handle two spellcasting data formats:
    // Format A (PF2eTools internal): block.entries = { "3": { spells: [...] }, ... }
    // Format B (user-friendly array): block.spells = [{ level: 3, spells: [...] }, ...]

    if (block.spells && Array.isArray(block.spells)) {
      // Format B: array of { level, spells }
      const sorted = [...block.spells].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
      for (const entry of sorted) {
        const lvl = entry.level ?? 0;
        const spellNames = (entry.spells ?? []).map(s => typeof s === 'string' ? stripPf2eTags(s) : stripPf2eTags(s.name ?? '')).join(', ');
        if (!spellNames) continue;
        const label = lvl === 0 ? 'Cantrips' : `**${ordinal(lvl)}**`;
        lines.push(`  ${label} ${spellNames}`);
      }
    } else {
      // Format A: PF2eTools internal object keyed by level
      // The JSON field is "entry" (singular), not "entries" (plural).
      // Level "0" contains cantrips (with a "level" field for heightened rank).
      const entry = block.entry ?? block.entries ?? {};

      // Cantrips: either in block.cantrips or in entry["0"]
      if (block.cantrips) {
        const spells = renderSpellLevel(block.cantrips);
        if (spells) lines.push(`  Cantrips ${spells}`);
      } else if (entry['0']) {
        const cantrips = renderSpellLevel(entry['0']);
        const heightenedLvl = entry['0'].level ? ` (${ordinal(entry['0'].level)})` : '';
        if (cantrips) lines.push(`  **Cantrips${heightenedLvl}** ${cantrips}`);
      }

      // Leveled spells (skip level 0 — already handled as cantrips)
      for (const [lvl, data] of Object.entries(entry).sort(([a], [b]) => Number(a) - Number(b))) {
        if (lvl === '0') continue; // cantrips handled above
        const lvlSpells = renderSpellLevel(data);
        const slots = data.slots ? ` (${data.slots} slots)` : '';
        if (lvlSpells) lines.push(`  **${ordinal(Number(lvl))}${slots}** ${lvlSpells}`);
      }

      // Focus spells
      if (block.focus) {
        for (const [lvl, data] of Object.entries(block.focus).sort(([a], [b]) => Number(a) - Number(b))) {
          const lvlSpells = renderSpellLevel(data);
          if (lvlSpells) lines.push(`  **Focus ${ordinal(Number(lvl))}** ${lvlSpells}`);
        }
      }
    }

    // Rituals
    if (block.rituals && Array.isArray(block.rituals)) {
      lines.push(`  Rituals ${block.rituals.map(r => typeof r === 'string' ? r : r.name ?? '').join(', ')}`);
    }

    return lines.join('\n\n');
  });

  return blocks.join('\n\n');
}

/**
 * Render a spell level entry to a string of spell names.
 * @param {{ spells?: Array<{name: string}> } | object} data
 * @returns {string}
 */
function renderSpellLevel(data) {
  if (!data) return '';
  const spells = data.spells ?? [];
  return spells.map((s) => (typeof s === 'string' ? stripPf2eTags(s) : stripPf2eTags(s.name ?? ''))).join(', ');
}

/**
 * Simple ordinal suffix helper.
 * @param {number} n
 * @returns {string}
 */
function ordinal(n) {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]}`;
}

/**
 * Convert a PF2eTools creature JSON object to a markdown stat block string.
 *
 * Pure function — no Node.js or browser dependencies. Only import is stripPf2eTags.
 *
 * @param {object} creature - A PF2eTools creature JSON object
 * @returns {string} Markdown stat block
 */
export function renderPf2eCreatureToMarkdown(creature) {
  const lines = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`# ${creature.name}`);
  lines.push(`*Creature ${creature.level ?? 0}*`);
  lines.push('');

  // Traits
  const traits = creature.traits ?? [];
  if (traits.length > 0) {
    lines.push(traits.join(', '));
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // ── Senses / Languages / Skills / Ability Mods ──────────────────────────────
  // Perception
  const percMod = fmtMod(creature.perception?.std);
  const senses = creature.perception?.senses ?? [];
  const sensesStr = senses.length > 0 ? `; ${senses.map((s) => s.name).join(', ')}` : '';
  lines.push(`**Perception** ${percMod}${sensesStr}`);
  lines.push('');

  // Languages
  const langs = creature.languages?.languages ?? [];
  if (langs.length > 0) {
    lines.push(`**Languages** ${langs.map((l) => (typeof l === 'string' ? l : l.name)).join(', ')}`);
    lines.push('');
  }

  // Skills
  const skills = creature.skills ?? [];
  if (skills.length > 0) {
    const skillStr = skills
      .map((s) => `**${s.name}** ${fmtMod(s.std)}`)
      .join(', ');
    lines.push(`**Skills** ${skillStr}`);
    lines.push('');
  }

  // Ability mods
  const mods = creature.abilityMods ?? {};
  const abilityLine = [
    `**STR** ${fmtMod(mods.str)}`,
    `**DEX** ${fmtMod(mods.dex)}`,
    `**CON** ${fmtMod(mods.con)}`,
    `**INT** ${fmtMod(mods.int)}`,
    `**WIS** ${fmtMod(mods.wis)}`,
    `**CHA** ${fmtMod(mods.cha)}`,
  ].join(', ');
  lines.push(abilityLine);
  lines.push('');

  // Items
  const items = creature.items ?? [];
  if (items.length > 0) {
    lines.push(`**Items** ${items.map((i) => (typeof i === 'string' ? i : i.name ?? '')).join(', ')}`);
    lines.push('');
  }

  // Top abilities
  const topAbilities = creature.abilities?.top ?? [];
  if (topAbilities.length > 0) {
    topAbilities.forEach((ab) => { lines.push(renderAbility(ab)); lines.push(''); });
  }

  lines.push('---');
  lines.push('');

  // ── Defenses ────────────────────────────────────────────────────────────────
  const defenses = creature.defenses ?? {};

  lines.push(renderAc(defenses.ac));
  lines.push('');

  const saveAbilities = defenses.savingThrows?.abilities ?? [];
  lines.push(renderSaves(defenses.savingThrows, saveAbilities));
  lines.push('');

  lines.push(renderHp(defenses.hp));
  lines.push('');

  // Immunities
  const immunities = defenses.immunities ?? [];
  if (immunities.length > 0) {
    lines.push(`**Immunities** ${immunities.map((i) => (typeof i === 'string' ? i : i.name)).join(', ')}`);
    lines.push('');
  }

  // Resistances
  const resistances = defenses.resistances ?? [];
  if (resistances.length > 0) {
    const resStr = resistances
      .map((r) => {
        if (typeof r === 'string') return r;
        const val = r.amount != null ? ` ${r.amount}` : '';
        return `${r.name}${val}`;
      })
      .join(', ');
    lines.push(`**Resistances** ${resStr}`);
    lines.push('');
  }

  // Weaknesses
  const weaknesses = defenses.weaknesses ?? [];
  if (weaknesses.length > 0) {
    const weakStr = weaknesses
      .map((w) => {
        if (typeof w === 'string') return w;
        const val = w.amount != null ? ` ${w.amount}` : '';
        return `${w.name}${val}`;
      })
      .join(', ');
    lines.push(`**Weaknesses** ${weakStr}`);
    lines.push('');
  }

  // Mid abilities
  const midAbilities = creature.abilities?.mid ?? [];
  if (midAbilities.length > 0) {
    midAbilities.forEach((ab) => { lines.push(renderAbility(ab)); lines.push(''); });
  }

  lines.push('---');
  lines.push('');

  // ── Offense ─────────────────────────────────────────────────────────────────
  // Speed
  const speedStr = renderSpeed(creature.speed);
  if (speedStr) {
    lines.push(speedStr);
    lines.push('');
  }

  // Attacks
  const attacks = creature.attacks ?? [];
  attacks.forEach((atk) => { lines.push(renderAttack(atk)); lines.push(''); });

  // Spellcasting
  const spellcastingStr = renderSpellcasting(creature.spellcasting);
  if (spellcastingStr) {
    lines.push(spellcastingStr);
    lines.push('');
  }

  // Bot abilities
  const botAbilities = creature.abilities?.bot ?? [];
  botAbilities.forEach((ab) => { lines.push(renderAbility(ab)); lines.push(''); });

  return lines.join('\n');
}
