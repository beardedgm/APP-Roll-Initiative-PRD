/**
 * Utilities for parsing and validating 5e monster JSON imports.
 * Supports Open5e, 5etools, and a simple custom format.
 */
import { renderPf2eCreatureToMarkdown } from '../../../shared/pf2eMarkdownRenderer.js';
import { stripPf2eTags } from '../../../shared/pf2eTagStripper.js';

const VALID_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const VALID_CRS = [
  '0', '1/8', '1/4', '1/2',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
];

/** Skeleton template users can start from */
export const MONSTER_JSON_TEMPLATE = {
  name: 'Custom Monster',
  size: 'Medium',
  type: 'beast',
  alignment: 'unaligned',
  ac: 13,
  acDesc: 'natural armor',
  hp: 45,
  hpFormula: '6d8 + 18',
  speed: '30 ft.',
  cr: '3',
  abilities: {
    str: 16, dex: 12, con: 16, int: 2, wis: 12, cha: 6,
  },
  traits: [
    { name: 'Keen Senses', description: 'The monster has advantage on Wisdom (Perception) checks that rely on smell.' },
  ],
  actions: [
    { name: 'Bite', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.' },
  ],
  reactions: [],
  legendaryActions: [],
  senses: 'darkvision 60 ft., passive Perception 13',
  languages: '—',
  savingThrows: '',
  skills: '',
  damageResistances: '',
  damageImmunities: '',
  damageVulnerabilities: '',
  conditionImmunities: '',
};

/**
 * Parse raw JSON text into a normalized monster object.
 * Handles Open5e API format, 5etools format, and simple custom format.
 */
export function parseMonsterJSON(jsonText) {
  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON — check for syntax errors.');
  }

  // 5etools wraps monsters in { monster: [...] }
  if (raw.monster && Array.isArray(raw.monster)) {
    if (raw.monster.length === 0) throw new Error('No monsters found in 5etools data.');
    raw = raw.monster[0];
  }

  // Open5e returns { results: [...] }
  if (raw.results && Array.isArray(raw.results)) {
    if (raw.results.length === 0) throw new Error('No monsters found in Open5e data.');
    raw = raw.results[0];
  }

  return normalizeMonster(raw);
}

/**
 * Normalize various 5e JSON formats into our API shape.
 */
function normalizeMonster(raw) {
  const monster = {};

  // Name (required)
  monster.name = raw.name || raw.Name || '';

  // Size
  monster.size = normalizeSize(raw.size || raw.Size || 'Medium');

  // Type
  monster.type = normalizeType(raw.type || raw.Type || 'beast');

  // Alignment
  monster.alignment = raw.alignment || raw.Alignment || '';

  // AC
  if (typeof raw.ac === 'number') {
    monster.ac = raw.ac;
  } else if (Array.isArray(raw.ac)) {
    // 5etools format: ac: [{ ac: 15, from: ["natural armor"] }]
    const first = raw.ac[0];
    monster.ac = typeof first === 'number' ? first : first?.ac || 10;
    if (first?.from) monster.acDesc = first.from.join(', ');
  } else if (typeof raw.armor_class === 'number') {
    monster.ac = raw.armor_class;
  } else {
    monster.ac = parseInt(raw.ac) || 10;
  }
  if (raw.acDesc || raw.ac_desc) monster.acDesc = raw.acDesc || raw.ac_desc;

  // HP
  if (typeof raw.hp === 'object' && raw.hp !== null) {
    // 5etools: hp: { average: 45, formula: "6d8+18" }
    monster.hp = raw.hp.average || raw.hp.hp || 1;
    monster.hpFormula = raw.hp.formula || raw.hp.hit_dice || '';
  } else if (typeof raw.hit_points === 'number') {
    // Open5e
    monster.hp = raw.hit_points;
    monster.hpFormula = raw.hit_dice || '';
  } else {
    monster.hp = parseInt(raw.hp) || 1;
    monster.hpFormula = raw.hpFormula || raw.hit_dice || '';
  }

  // Speed
  if (typeof raw.speed === 'string') {
    monster.speed = raw.speed;
  } else if (typeof raw.speed === 'object' && raw.speed !== null) {
    // 5etools: speed: { walk: 30, fly: 60 }
    const parts = [];
    for (const [mode, val] of Object.entries(raw.speed)) {
      if (mode === 'walk') parts.unshift(`${val} ft.`);
      else if (typeof val === 'number') parts.push(`${mode} ${val} ft.`);
      else if (typeof val === 'object' && val.number) parts.push(`${mode} ${val.number} ft.`);
    }
    monster.speed = parts.join(', ') || '30 ft.';
  } else {
    monster.speed = '30 ft.';
  }

  // CR
  monster.cr = normalizeCR(raw.cr || raw.challenge_rating || raw.CR || '0');

  // Ability scores
  monster.abilities = {
    str: raw.abilities?.str || raw.strength || raw.str || 10,
    dex: raw.abilities?.dex || raw.dexterity || raw.dex || 10,
    con: raw.abilities?.con || raw.constitution || raw.con || 10,
    int: raw.abilities?.int || raw.intelligence || raw.int || 10,
    wis: raw.abilities?.wis || raw.wisdom || raw.wis || 10,
    cha: raw.abilities?.cha || raw.charisma || raw.cha || 10,
  };

  // Initiative modifier (derived from DEX if not provided)
  monster.initMod = raw.initMod ?? Math.floor((monster.abilities.dex - 10) / 2);

  // Text fields
  monster.senses = raw.senses || '';
  monster.languages = raw.languages || '';
  monster.savingThrows = raw.savingThrows || raw.saving_throws || raw.save || '';
  monster.skills = raw.skills || '';
  monster.damageResistances = raw.damageResistances || raw.damage_resistances || '';
  monster.damageImmunities = raw.damageImmunities || raw.damage_immunities || '';
  monster.damageVulnerabilities = raw.damageVulnerabilities || raw.damage_vulnerabilities || '';
  monster.conditionImmunities = raw.conditionImmunities || raw.condition_immunities || '';

  // Stringify object fields (Open5e sometimes uses objects for saves/skills)
  for (const key of ['savingThrows', 'skills', 'senses', 'languages']) {
    if (typeof monster[key] === 'object' && monster[key] !== null) {
      monster[key] = Object.entries(monster[key]).map(([k, v]) => `${k} ${v}`).join(', ');
    }
  }
  for (const key of ['damageResistances', 'damageImmunities', 'damageVulnerabilities', 'conditionImmunities']) {
    if (Array.isArray(monster[key])) {
      monster[key] = monster[key].join(', ');
    }
  }

  // Traits, Actions, Reactions, Legendary Actions
  monster.traits = normalizeEntries(raw.traits || raw.trait || raw.special_abilities || []);
  monster.actions = normalizeEntries(raw.actions || raw.action || []);
  monster.reactions = normalizeEntries(raw.reactions || raw.reaction || []);
  monster.legendaryActions = normalizeEntries(raw.legendaryActions || raw.legendary_actions || raw.legendaryAction || []);

  // Raw markdown (if provided directly)
  if (raw.rawMarkdown) monster.rawMarkdown = raw.rawMarkdown;

  return monster;
}

function normalizeSize(size) {
  if (typeof size === 'object' && Array.isArray(size)) size = size[0];
  const s = String(size).trim();
  // 5etools uses single letters: T, S, M, L, H, G
  const sizeMap = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
  if (sizeMap[s]) return sizeMap[s];
  const match = VALID_SIZES.find(vs => vs.toLowerCase() === s.toLowerCase());
  return match || 'Medium';
}

function normalizeType(type) {
  if (typeof type === 'object' && type !== null) {
    return type.type || type.name || 'beast';
  }
  return String(type).trim() || 'beast';
}

function normalizeCR(cr) {
  if (typeof cr === 'object' && cr !== null) {
    cr = cr.cr || cr.rating || '0';
  }
  const s = String(cr).trim();
  if (VALID_CRS.includes(s)) return s;
  // Try numeric conversion
  const n = parseFloat(s);
  if (n === 0.125) return '1/8';
  if (n === 0.25) return '1/4';
  if (n === 0.5) return '1/2';
  if (!isNaN(n) && n >= 0 && n <= 30) return String(Math.round(n));
  return '0';
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(e => ({
    name: e.name || e.Name || 'Unnamed',
    description: e.description || e.desc || e.text ||
      (Array.isArray(e.entries) ? e.entries.join('\n') : '') || '',
  })).filter(e => e.name || e.description);
}

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

function normalizePf2eCreature(raw) {
  const monster = {};

  monster.name = stripPf2eTags(raw.name || '');
  monster.gameSystem = 'pf2e';

  // Size: find from traits array
  const sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
  const rawTraits = Array.isArray(raw.traits) ? raw.traits : [];
  const sizeFound = rawTraits.find(t => sizes.includes(t));
  monster.size = sizeFound || 'Medium';

  // Type: traits minus size, rarity, and alignment codes
  const excludeTraits = [...sizes, 'N', 'NG', 'NE', 'CG', 'CE', 'LG', 'LE', 'LN', 'CN',
    'Common', 'Uncommon', 'Rare', 'Unique'];
  monster.type = rawTraits.filter(t => !excludeTraits.includes(t)).join(', ');

  monster.alignment = '';
  monster.cr = String(raw.level || 0);
  monster.hp = raw.defenses?.hp?.[0]?.hp || 1;
  monster.ac = raw.defenses?.ac?.std || 10;
  monster.acDesc = '';
  monster.initMod = raw.perception?.std || 0;

  // Speed
  if (raw.speed) {
    const parts = [];
    if (raw.speed.walk) parts.push(`${raw.speed.walk} feet`);
    for (const [mode, val] of Object.entries(raw.speed)) {
      if (mode === 'walk' || mode === 'abilities' || mode === 'speedNote') continue;
      if (typeof val === 'number') parts.push(`${mode} ${val} feet`);
    }
    monster.speed = parts.join(', ') || '25 feet';
  } else {
    monster.speed = '25 feet';
  }

  // Ability modifiers
  if (raw.abilityMods) {
    monster.abilities = { ...raw.abilityMods };
  } else {
    monster.abilities = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  }

  // Text fields
  const fmtMod = (n) => n === undefined || n === null ? '+0' : (n >= 0 ? `+${n}` : String(n));
  monster.senses = (raw.perception?.senses || []).map(s => stripPf2eTags(typeof s === 'string' ? s : s.name || '')).join(', ');
  monster.languages = (raw.languages?.languages || []).map(l => stripPf2eTags(typeof l === 'string' ? l : l.name || '')).join(', ');
  monster.savingThrows = `Fort ${fmtMod(raw.defenses?.savingThrows?.fort?.std)}, Ref ${fmtMod(raw.defenses?.savingThrows?.ref?.std)}, Will ${fmtMod(raw.defenses?.savingThrows?.will?.std)}`;
  monster.skills = (raw.skills || []).map(s => `${stripPf2eTags(s.name)} ${fmtMod(s.std)}`).join(', ');
  monster.damageResistances = (raw.defenses?.resistances || []).map(r => `${stripPf2eTags(r.name || '')} ${r.amount || ''}`).join(', ');
  monster.damageImmunities = (raw.defenses?.immunities || []).map(i => stripPf2eTags(typeof i === 'string' ? i : i.name || '')).join(', ');
  monster.damageVulnerabilities = (raw.defenses?.weaknesses || []).map(w => `${stripPf2eTags(w.name || '')} ${w.amount || ''}`).join(', ');
  monster.conditionImmunities = '';

  // Generate rawMarkdown
  try {
    monster.rawMarkdown = renderPf2eCreatureToMarkdown(raw);
  } catch {
    monster.rawMarkdown = '';
  }

  monster.traits = [];
  monster.actions = [];
  monster.reactions = [];
  monster.legendaryActions = [];

  return monster;
}

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

/**
 * Validate a normalized monster object. Returns an array of error strings.
 */
export function validateMonsterData(data) {
  const errors = [];

  if (!data.name || !data.name.trim()) {
    errors.push('Name is required.');
  } else if (data.name.length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }

  if (!VALID_SIZES.includes(data.size)) {
    errors.push(`Invalid size "${data.size}". Must be one of: ${VALID_SIZES.join(', ')}`);
  }

  if (!data.type || !data.type.trim()) {
    errors.push('Type is required.');
  }

  if (typeof data.ac !== 'number' || data.ac < 0 || data.ac > 99) {
    errors.push('AC must be a number between 0 and 99.');
  }

  if (typeof data.hp !== 'number' || data.hp < 1) {
    errors.push('HP must be at least 1.');
  }

  if (data.cr && !VALID_CRS.includes(data.cr)) {
    errors.push(`Invalid CR "${data.cr}". Must be a valid 5e CR value.`);
  }

  if (data.abilities) {
    for (const [stat, val] of Object.entries(data.abilities)) {
      if (typeof val !== 'number' || val < 1 || val > 30) {
        errors.push(`${stat.toUpperCase()} must be between 1 and 30.`);
      }
    }
  }

  if (data.rawMarkdown && data.rawMarkdown.length > 50000) {
    errors.push('Raw markdown must be 50,000 characters or fewer.');
  }

  return errors;
}
