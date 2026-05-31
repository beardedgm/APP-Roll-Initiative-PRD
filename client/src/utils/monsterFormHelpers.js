/**
 * Helper constants and utilities for the custom monster creation form.
 */

export const SIZE_OPTIONS = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

export const TYPE_OPTIONS = [
  'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental',
  'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead',
];

export const ALIGNMENT_OPTIONS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
  'Unaligned', 'Any Alignment',
];

export const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
];

export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant',
  'Slashing', 'Thunder',
];

export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

export const ABILITY_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

export function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(score) {
  const mod = calculateModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calculateProficiencyBonus(cr) {
  const crNum = parseCR(cr);
  if (crNum < 5) return 2;
  if (crNum < 9) return 3;
  if (crNum < 13) return 4;
  if (crNum < 17) return 5;
  if (crNum < 21) return 6;
  if (crNum < 25) return 7;
  if (crNum < 29) return 8;
  return 9;
}

function parseCR(cr) {
  if (!cr) return 0;
  if (cr === '1/8') return 0.125;
  if (cr === '1/4') return 0.25;
  if (cr === '1/2') return 0.5;
  return parseFloat(cr) || 0;
}

/** Default form state for a new monster */
export function getDefaultFormData() {
  return {
    name: '',
    size: 'Medium',
    type: 'Beast',
    alignment: 'Unaligned',
    ac: 10,
    acDesc: '',
    hp: 1,
    hpFormula: '',
    speed: '30 ft.',
    cr: '0',
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: '',
    skills: '',
    senses: '',
    languages: '',
    damageResistances: '',
    damageImmunities: '',
    damageVulnerabilities: '',
    conditionImmunities: '',
    traits: [],
    actions: [],
    reactions: [],
    legendaryActions: [],
    rawMarkdown: '',
  };
}

// ── Repeatable entry identity (UI-only) ──
// Form entries (traits/actions/reactions/legendary) carry a stable `id` so
// React can key them by identity instead of array index — index keys corrupt
// controlled-input values when a middle entry is removed. The id is a pure UI
// concern and is stripped before the payload reaches the API.
export const ENTRY_KEYS = ['traits', 'actions', 'reactions', 'legendaryActions'];

let _entryIdCounter = 0;
export function newEntryId() {
  return `entry_${Date.now()}_${(_entryIdCounter++).toString(36)}`;
}

/** Ensure every repeatable entry in the form has a stable id (backfills on edit). */
export function withEntryIds(formData) {
  const next = { ...formData };
  for (const key of ENTRY_KEYS) {
    if (Array.isArray(next[key])) {
      next[key] = next[key].map(e => (e.id ? e : { ...e, id: newEntryId() }));
    }
  }
  return next;
}

/** Drop the UI-only id from entries before serializing to the API. */
export function stripEntryIds(entries) {
  return entries.map(e => ({ name: e.name, description: e.description }));
}

/** Convert form data to the API payload format */
export function formDataToMonsterAPI(formData) {
  const payload = { ...formData };
  // Calculate initMod from DEX
  payload.initMod = calculateModifier(formData.abilities.dex);
  // Remove empty arrays/strings to keep payload clean; strip UI-only entry ids
  if (!payload.rawMarkdown) delete payload.rawMarkdown;
  for (const key of ENTRY_KEYS) {
    if (payload[key]?.length) payload[key] = stripEntryIds(payload[key]);
    else delete payload[key];
  }
  return payload;
}

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
    type: '',
    rarity: 'Common',
    perception: 0,
    ac: 15,
    acDesc: '',
    hp: 10,
    fort: 0,
    ref: 0,
    will: 0,
    speed: '25 feet',
    abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
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
  const mod = (n) => n >= 0 ? `+${n}` : String(n);
  const f = formData;

  // Build markdown from form data
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
    for (const act of f.actions) {
      lines.push(`**${act.name}** ${act.description}`);
      lines.push('');
    }
  }

  const rawMarkdown = f.rawMarkdown || lines.join('\n');

  return {
    name: f.name,
    size: f.size,
    type: f.type || 'Creature',
    alignment: '',
    cr: String(f.level),
    hp: f.hp,
    ac: f.ac,
    acDesc: f.acDesc || '',
    initMod: f.perception,
    abilities: f.abilities,
    speed: f.speed,
    gameSystem: 'pf2e',
    rawMarkdown,
    traits: f.traits?.length > 0 ? stripEntryIds(f.traits) : undefined,
    actions: f.actions?.length > 0 ? stripEntryIds(f.actions) : undefined,
    reactions: f.reactions?.length > 0 ? stripEntryIds(f.reactions) : undefined,
  };
}

/** Convert an API monster to form data for editing */
export function monsterAPIToFormData(monster) {
  return {
    name: monster.name || '',
    size: monster.size || 'Medium',
    type: monster.type || 'Beast',
    alignment: monster.alignment || '',
    ac: monster.ac || 10,
    acDesc: monster.acDesc || '',
    hp: monster.hp || 1,
    hpFormula: monster.hpFormula || '',
    speed: monster.speed || '30 ft.',
    cr: monster.cr || '0',
    abilities: monster.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: monster.savingThrows || '',
    skills: monster.skills || '',
    senses: monster.senses || '',
    languages: monster.languages || '',
    damageResistances: monster.damageResistances || '',
    damageImmunities: monster.damageImmunities || '',
    damageVulnerabilities: monster.damageVulnerabilities || '',
    conditionImmunities: monster.conditionImmunities || '',
    traits: monster.traits || [],
    actions: monster.actions || [],
    reactions: monster.reactions || [],
    legendaryActions: monster.legendaryActions || [],
    rawMarkdown: monster.rawMarkdown || '',
  };
}
