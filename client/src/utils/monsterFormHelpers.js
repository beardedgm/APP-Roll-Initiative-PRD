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

/** Convert form data to the API payload format */
export function formDataToMonsterAPI(formData) {
  const payload = { ...formData };
  // Calculate initMod from DEX
  payload.initMod = calculateModifier(formData.abilities.dex);
  // Remove empty arrays/strings to keep payload clean
  if (!payload.rawMarkdown) delete payload.rawMarkdown;
  if (payload.traits?.length === 0) delete payload.traits;
  if (payload.actions?.length === 0) delete payload.actions;
  if (payload.reactions?.length === 0) delete payload.reactions;
  if (payload.legendaryActions?.length === 0) delete payload.legendaryActions;
  return payload;
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
