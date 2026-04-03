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
 */
function fmtMod(n) {
  if (n === undefined || n === null) return '+0';
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Resolve action cost symbols from an activity descriptor.
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
 * Simple ordinal suffix helper: 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th".
 */
function ordinal(n) {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]}`;
}

// ── Ability Rendering ────────────────────────────────────────────────────────

/**
 * Render a single ability entry (top, mid, or bot ability block).
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
        : ability.frequency.entry ?? ability.frequency.special ?? JSON.stringify(ability.frequency);
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
 * Render a single entry value (string, list object, successDegree object, affliction, etc.)
 */
function renderEntry(entry) {
  if (typeof entry === 'string') {
    return stripPf2eTags(entry);
  }
  if (typeof entry !== 'object' || entry === null) return '';

  if (entry.type === 'list') {
    const items = (entry.items ?? []).map((item) =>
      `- ${stripPf2eTags(typeof item === 'string' ? item : item.entry ?? '')}`
    );
    return items.join('\n');
  }

  if (entry.type === 'successDegree') {
    const degrees = ['Critical Success', 'Success', 'Failure', 'Critical Failure'];
    const lines = degrees
      .filter((d) => entry.entries?.[d])
      .map((d) => `**${d}** ${stripPf2eTags(entry.entries[d])}`);
    return lines.join('\n');
  }

  // Affliction / Poison / Disease
  if (entry.type === 'affliction') {
    const affLines = [];
    if (entry.name) affLines.push(`**${stripPf2eTags(entry.name)}**`);
    const meta = [];
    if (entry.traits?.length) meta.push(`(${entry.traits.join(', ')})`);
    if (entry.DC) meta.push(`**Saving Throw** DC ${entry.DC} ${entry.savingThrow ?? 'Fortitude'}`);
    if (meta.length) affLines.push(meta.join('; '));
    if (entry.onset) affLines.push(`**Onset** ${stripPf2eTags(entry.onset)}`);
    if (entry.maxDuration) affLines.push(`**Maximum Duration** ${stripPf2eTags(entry.maxDuration)}`);
    if (entry.stages) {
      for (const stage of entry.stages) {
        affLines.push(`**Stage ${stage.stage}** ${stripPf2eTags(stage.entry ?? '')} (${stage.duration ?? ''})`);
      }
    }
    return affLines.join('\n');
  }

  // Generic object with an 'entry' field
  if (entry.entry) return stripPf2eTags(entry.entry);

  // Fallback: try name + entries
  if (entry.name && entry.entries) {
    return `**${entry.name}** ${entry.entries.map(renderEntry).join(' ')}`;
  }

  return '';
}

// ── Section Renderers ────────────────────────────────────────────────────────

/**
 * Render perception line with senses including type and range.
 */
function renderPerception(perception) {
  if (!perception) return '**Perception** +0';
  const mod = fmtMod(perception.std);
  const senses = perception.senses ?? [];
  if (senses.length === 0) return `**Perception** ${mod}`;

  const senseStrs = senses.map((s) => {
    let str = s.name;
    if (s.range) str += ` ${s.range} feet`;
    if (s.type) str += ` (${s.type})`;
    return str;
  });
  return `**Perception** ${mod}; ${senseStrs.join(', ')}`;
}

/**
 * Render languages line including special abilities (telepathy, etc.).
 */
function renderLanguages(languages) {
  if (!languages) return '';
  const langs = languages.languages ?? [];
  const abilities = languages.abilities ?? [];
  const parts = [];
  if (langs.length > 0) {
    parts.push(langs.map((l) => (typeof l === 'string' ? l : l.name)).join(', '));
  }
  if (abilities.length > 0) {
    parts.push(abilities.map(stripPf2eTags).join(', '));
  }
  return parts.length > 0 ? `**Languages** ${parts.join('; ')}` : '';
}

/**
 * Render skills line. Skills can be an object (PF2eTools format) or array.
 */
function renderSkills(skills) {
  if (!skills) return '';

  // Object format: { "athletics": { "std": 16, "note": "..." }, ... }
  if (!Array.isArray(skills)) {
    const entries = Object.entries(skills);
    if (entries.length === 0) return '';
    const skillStrs = entries.map(([name, data]) => {
      const mod = fmtMod(data.std ?? data);
      const notePart = data.note ? ` (${stripPf2eTags(data.note)})` : '';
      // Capitalize skill name
      const capName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `${capName} ${mod}${notePart}`;
    });
    return `**Skills** ${skillStrs.join(', ')}`;
  }

  // Array format: [{ "name": "Athletics", "std": 16 }, ...]
  if (skills.length === 0) return '';
  const skillStrs = skills.map((s) => {
    const mod = fmtMod(s.std);
    const notePart = s.note ? ` (${stripPf2eTags(s.note)})` : '';
    return `${s.name} ${mod}${notePart}`;
  });
  return `**Skills** ${skillStrs.join(', ')}`;
}

/**
 * Render speed block including special movement abilities.
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
  // Speed abilities (e.g., swamp stride)
  const abilities = speed.abilities ?? [];
  if (abilities.length > 0) {
    parts.push(abilities.map(stripPf2eTags).join(', '));
  }
  return parts.length > 0 ? `Speed ${parts.join(', ')}` : '';
}

/**
 * Render HP block from the hp array.
 */
function renderHp(hpArr) {
  if (!hpArr || hpArr.length === 0) return '**HP** \u2014';
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
 */
function renderAc(ac) {
  if (!ac) return '**AC** \u2014';
  const variants = Object.entries(ac)
    .filter(([key]) => key !== 'std')
    .map(([key, val]) => `${val} ${key}`);
  const base = `**AC** ${ac.std}`;
  return variants.length > 0 ? `${base}; ${variants.join(', ')}` : base;
}

/**
 * Render saving throws line.
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
 * Render immunities with proper name extraction.
 */
function renderImmunities(immunities) {
  if (!immunities || immunities.length === 0) return '';
  const strs = immunities.map((i) => (typeof i === 'string' ? i : i.name ?? ''));
  return `**Immunities** ${strs.join(', ')}`;
}

/**
 * Render resistances with amounts and notes (e.g., "physical 10 (except bludgeoning)").
 */
function renderResistances(resistances) {
  if (!resistances || resistances.length === 0) return '';
  const strs = resistances.map((r) => {
    if (typeof r === 'string') return r;
    let str = r.name;
    if (r.amount != null) str += ` ${r.amount}`;
    if (r.note) str += ` (${stripPf2eTags(r.note)})`;
    return str;
  });
  return `**Resistances** ${strs.join(', ')}`;
}

/**
 * Render weaknesses with amounts and notes.
 */
function renderWeaknesses(weaknesses) {
  if (!weaknesses || weaknesses.length === 0) return '';
  const strs = weaknesses.map((w) => {
    if (typeof w === 'string') return w;
    let str = w.name;
    if (w.amount != null) str += ` ${w.amount}`;
    if (w.note) str += ` (${stripPf2eTags(w.note)})`;
    return str;
  });
  return `**Weaknesses** ${strs.join(', ')}`;
}

/**
 * Render a single attack line with action symbol and range type.
 */
function renderAttack(attack) {
  const isRanged = attack.range === 'Ranged' || attack.type === 'ranged';
  const type = isRanged ? '**Ranged**' : '**Melee**';
  const mod = fmtMod(attack.attack);
  const traits = attack.traits && attack.traits.length > 0
    ? ` (${attack.traits.map(stripPf2eTags).join(', ')})`
    : '';
  const damage = attack.damage ? ` **Damage** ${stripPf2eTags(attack.damage)}` : '';
  const effects = attack.effects && attack.effects.length > 0
    ? ` plus ${attack.effects.map(stripPf2eTags).join(', ')}`
    : '';
  return `${type} \u25C6 ${attack.name} ${mod}${traits};${damage}${effects}`;
}

// ── Spellcasting ─────────────────────────────────────────────────────────────

/**
 * Render a single spell name with amount annotation (at will, ×3, etc.).
 */
function renderSpellName(spell) {
  if (typeof spell === 'string') return stripPf2eTags(spell);
  const name = stripPf2eTags(spell.name ?? '');
  if (!spell.amount) return name;
  if (typeof spell.amount === 'string') return `${name} (${spell.amount})`;
  if (typeof spell.amount === 'number' && spell.amount > 1) return `${name} (\u00D7${spell.amount})`;
  return name;
}

/**
 * Render a spell level entry to a string of spell names with amounts.
 */
function renderSpellLevel(data) {
  if (!data) return '';
  const spells = data.spells ?? [];
  return spells.map(renderSpellName).join(', ');
}

/**
 * Render spellcasting block(s).
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
    // Format A (PF2eTools internal): block.entry = { "3": { spells: [...] }, ... }
    // Format B (user-friendly array): block.spells = [{ level: 3, spells: [...] }, ...]

    if (block.spells && Array.isArray(block.spells)) {
      // Format B: array of { level, spells }
      const sorted = [...block.spells].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
      for (const spellEntry of sorted) {
        const lvl = spellEntry.level ?? 0;
        const spellNames = (spellEntry.spells ?? []).map(renderSpellName).join(', ');
        if (!spellNames) continue;
        const label = lvl === 0 ? 'Cantrips' : `**${ordinal(lvl)}**`;
        lines.push(`  ${label} ${spellNames}`);
      }
    } else {
      // Format A: PF2eTools internal object keyed by level
      const entry = block.entry ?? block.entries ?? {};

      // Constant spells (always active, like "true seeing")
      if (entry.constant) {
        for (const [lvl, data] of Object.entries(entry.constant).sort(([a], [b]) => Number(b) - Number(a))) {
          const constSpells = renderSpellLevel(data);
          if (constSpells) lines.push(`  **Constant (${ordinal(Number(lvl))})** ${constSpells}`);
        }
      }

      // Cantrips: either in block.cantrips or in entry["0"]
      if (block.cantrips) {
        const spells = renderSpellLevel(block.cantrips);
        if (spells) lines.push(`  **Cantrips** ${spells}`);
      } else if (entry['0']) {
        const cantrips = renderSpellLevel(entry['0']);
        const heightenedLvl = entry['0'].level ? ` (${ordinal(entry['0'].level)})` : '';
        if (cantrips) lines.push(`  **Cantrips${heightenedLvl}** ${cantrips}`);
      }

      // Leveled spells (skip level 0 — already handled as cantrips, skip "constant")
      for (const [lvl, data] of Object.entries(entry).sort(([a], [b]) => Number(a) - Number(b))) {
        if (lvl === '0' || lvl === 'constant') continue;
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
      const ritualNames = block.rituals.map(r => typeof r === 'string' ? r : r.name ?? '').join(', ');
      if (ritualNames) lines.push(`  **Rituals** ${ritualNames}`);
    }

    return lines.join('\n\n');
  });

  return blocks.join('\n\n');
}

// ── Main Export ──────────────────────────────────────────────────────────────

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
  // Senses may be in creature.perception.senses or creature.senses (top-level)
  const perception = creature.perception ?? {};
  const senses = perception.senses ?? creature.senses ?? [];
  lines.push(renderPerception({ ...perception, senses }));
  lines.push('');

  const langLine = renderLanguages(creature.languages);
  if (langLine) { lines.push(langLine); lines.push(''); }

  const skillLine = renderSkills(creature.skills);
  if (skillLine) { lines.push(skillLine); lines.push(''); }

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
    lines.push(`**Items** ${items.map((i) => stripPf2eTags(typeof i === 'string' ? i : i.name ?? '')).join(', ')}`);
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

  const immLine = renderImmunities(defenses.immunities);
  if (immLine) { lines.push(immLine); lines.push(''); }

  const resLine = renderResistances(defenses.resistances);
  if (resLine) { lines.push(resLine); lines.push(''); }

  const weakLine = renderWeaknesses(defenses.weaknesses);
  if (weakLine) { lines.push(weakLine); lines.push(''); }

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
