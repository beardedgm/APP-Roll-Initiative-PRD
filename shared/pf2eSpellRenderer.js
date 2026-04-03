// shared/pf2eSpellRenderer.js
// Converts PF2eTools spell JSON to markdown format.

import { stripPf2eTags } from './pf2eTagStripper.js';

const ACTION_SYMBOLS = { 1: '\u25C6', 2: '\u25C6\u25C6', 3: '\u25C6\u25C6\u25C6' };
const SAVE_MAP = { F: 'Fortitude', R: 'Reflex', W: 'Will' };
const COMPONENT_MAP = { S: 'somatic', V: 'verbal', M: 'material', F: 'focus' };

function castToString(cast) {
  if (!cast) return null;
  if (cast.entry) return stripPf2eTags(cast.entry);
  const num = cast.number || 1;
  const unit = cast.unit || 'action';
  if (unit === 'action') return ACTION_SYMBOLS[num] || `${num} actions`;
  if (unit === 'reaction') return '\u25C8 Reaction';
  if (unit === 'free') return '\u25C7 Free Action';
  if (unit === 'minute') return `${num} minute${num > 1 ? 's' : ''}`;
  if (unit === 'hour') return `${num} hour${num > 1 ? 's' : ''}`;
  if (unit === 'varies') return 'Varies';
  return `${num} ${unit}`;
}

function componentsToString(components) {
  if (!components || !Array.isArray(components)) return null;
  // components is [[\"S\", \"V\"]] or [[\"S\", \"V\", \"M\"]]
  const flat = components.flat();
  return flat.map(c => COMPONENT_MAP[c] || c).join(', ');
}

function rangeToString(range) {
  if (!range) return null;
  if (range.entry) return stripPf2eTags(range.entry);
  if (range.unit === 'touch') return 'touch';
  if (range.number && range.unit) return `${range.number} ${range.unit}`;
  return null;
}

function durationToString(duration) {
  if (!duration) return null;
  if (duration.entry) return stripPf2eTags(duration.entry);
  if (duration.type === 'timed') {
    const num = duration.duration?.number || duration.number;
    const unit = duration.duration?.unit || duration.unit;
    const sustain = duration.sustain ? ' (sustained)' : '';
    const dismiss = duration.dismiss ? ' (dismissible)' : '';
    if (num && unit) return `${num} ${unit}${num > 1 ? 's' : ''}${sustain}${dismiss}`;
  }
  if (duration.number && duration.unit) {
    const sustain = duration.sustain ? ' (sustained)' : '';
    const dismiss = duration.dismiss ? ' (dismissible)' : '';
    return `${duration.number} ${duration.unit}${duration.number > 1 ? 's' : ''}${sustain}${dismiss}`;
  }
  return null;
}

function processEntries(entries, depth = 0) {
  if (!entries || !Array.isArray(entries)) return '';
  const lines = [];

  for (const entry of entries) {
    if (typeof entry === 'string') {
      lines.push(stripPf2eTags(entry));
      lines.push('');
    } else if (entry && typeof entry === 'object') {
      if (entry.type === 'list') {
        for (const item of (entry.items || [])) {
          if (typeof item === 'string') {
            lines.push(`- ${stripPf2eTags(item)}`);
          } else if (item.name) {
            lines.push(`- **${stripPf2eTags(item.name)}** ${stripPf2eTags(item.entry || item.entries?.join(' ') || '')}`);
          }
        }
        lines.push('');
      } else if (entry.type === 'entries' || entry.type === 'entry') {
        if (entry.name) {
          lines.push(`**${stripPf2eTags(entry.name)}** ${stripPf2eTags(entry.entry || '')}`);
        }
        if (entry.entries) {
          lines.push(processEntries(entry.entries, depth + 1));
        }
      } else if (entry.type === 'successDegree') {
        const degrees = entry.entries || {};
        for (const [degree, text] of Object.entries(degrees)) {
          lines.push(`**${degree}** ${stripPf2eTags(text)}`);
          lines.push('');
        }
      } else if (entry.type === 'table') {
        // Simple table rendering
        if (entry.rows) {
          for (const row of entry.rows) {
            lines.push(row.map(c => stripPf2eTags(String(c))).join(' | '));
          }
          lines.push('');
        }
      } else if (entry.type === 'affliction') {
        if (entry.name) lines.push(`**${stripPf2eTags(entry.name)}**`);
        if (entry.DC) lines.push(`DC ${entry.DC} ${entry.savingThrow || ''}`);
        if (entry.onset) lines.push(`**Onset** ${stripPf2eTags(entry.onset)}`);
        if (entry.maxDuration) lines.push(`**Maximum Duration** ${stripPf2eTags(entry.maxDuration)}`);
        if (entry.stages) {
          for (const stage of entry.stages) {
            lines.push(`**Stage ${stage.stage}** ${stripPf2eTags(stage.entry)} (${stage.duration || ''})`);
          }
        }
        lines.push('');
      } else {
        // Fallback: try to get text content
        if (entry.entries) {
          lines.push(processEntries(entry.entries, depth + 1));
        }
      }
    }
  }

  return lines.join('\n');
}

function heightenedToString(heightened) {
  if (!heightened) return '';
  const lines = [];

  if (heightened.plusX) {
    for (const [interval, entries] of Object.entries(heightened.plusX)) {
      lines.push(`**Heightened (+${interval})** ${entries.map(e => stripPf2eTags(typeof e === 'string' ? e : '')).join(' ')}`);
      lines.push('');
    }
  }

  if (heightened.X) {
    for (const [level, entries] of Object.entries(heightened.X)) {
      const suffix = level === '1' ? 'st' : level === '2' ? 'nd' : level === '3' ? 'rd' : 'th';
      lines.push(`**Heightened (${level}${suffix})** ${entries.map(e => stripPf2eTags(typeof e === 'string' ? e : '')).join(' ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Render a PF2eTools spell JSON object to markdown.
 * @param {object} spell - PF2eTools spell JSON
 * @returns {string} Markdown string
 */
export function renderPf2eSpellToMarkdown(spell) {
  const lines = [];

  lines.push(`# ${spell.name}`);
  lines.push('');

  // Traits
  const traits = spell.traits || [];
  if (traits.length > 0) {
    lines.push(`*${traits.join(', ')}*`);
    lines.push('');
  }

  // Level
  const spellType = spell.focus ? 'Focus' : 'Spell';
  lines.push(`- **Level**: ${spellType} ${spell.level}`);

  // Traditions
  if (spell.traditions && spell.traditions.length > 0) {
    lines.push(`- **Traditions**: ${spell.traditions.join(', ')}`);
  }

  // Cast
  const castStr = castToString(spell.cast);
  if (castStr) {
    const compStr = componentsToString(spell.components);
    lines.push(`- **Cast**: ${castStr}${compStr ? ` (${compStr})` : ''}`);
  }

  // Range
  const rangeStr = rangeToString(spell.range);
  if (rangeStr) lines.push(`- **Range**: ${rangeStr}`);

  // Area
  if (spell.area?.entry) lines.push(`- **Area**: ${stripPf2eTags(spell.area.entry)}`);

  // Targets
  if (spell.targets) lines.push(`- **Targets**: ${stripPf2eTags(spell.targets)}`);

  // Saving Throw
  if (spell.savingThrow) {
    const saves = (spell.savingThrow.type || []).map(s => SAVE_MAP[s] || s).join(' or ');
    const basic = spell.savingThrow.basic ? 'basic ' : '';
    lines.push(`- **Saving Throw**: ${basic}${saves}`);
  }

  // Duration
  const durStr = durationToString(spell.duration);
  if (durStr) lines.push(`- **Duration**: ${durStr}`);

  // Source
  lines.push(`- **Source**: ${spell.source} p.${spell.page || '?'}`);

  lines.push('');
  lines.push('---');
  lines.push('');

  // Entries (description)
  const desc = processEntries(spell.entries);
  if (desc) lines.push(desc);

  // Heightened
  const heightenedStr = heightenedToString(spell.heightened);
  if (heightenedStr) {
    lines.push('---');
    lines.push('');
    lines.push(heightenedStr);
  }

  return lines.join('\n');
}
