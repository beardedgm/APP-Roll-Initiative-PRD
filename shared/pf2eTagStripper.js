// shared/pf2eTagStripper.js

const ABILITY_MAP = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

/**
 * Strip PF2eTools template tags from text.
 *
 * Generic rule: {@tag content} → content
 * Display text: {@tag ref||display} → display
 * Special: {@dc N} → "DC N", {@ability str} → "Strength"
 *
 * @param {string} text - Text potentially containing {@tag ...} template tags
 * @returns {string} Plain text with all tags stripped
 */
export function stripPf2eTags(text) {
  if (!text || typeof text !== 'string') return '';

  let result = text;
  let prev;
  do {
    prev = result;
    result = result.replace(/\{@(\w+)\s+([^{}]*)\}/g, (_, tag, content) => {
      if (content.includes('||')) {
        const parts = content.split('||');
        const afterPipe = parts[parts.length - 1];
        // Some tags use additional | separators in the display segment (e.g. quickref)
        // Take the last pipe-delimited part as the human-readable display text
        const subParts = afterPipe.split('|');
        return subParts[subParts.length - 1].trim();
      }
      if (tag === 'dc') return `DC ${content.trim()}`;
      if (tag === 'ability') return ABILITY_MAP[content.trim().toLowerCase()] || content.trim();
      return content.trim();
    });
  } while (result !== prev);

  return result;
}
