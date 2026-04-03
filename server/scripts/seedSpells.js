/**
 * seedSpells.js — Parse all .md spell files from spells/5e/ and spells/pf2e/ and upsert into MongoDB.
 *
 * Spell markdown format:
 *   # Spell Name
 *   - **Level**: 3 Evocation          (or "Cantrip Conjuration")
 *   - **Classes**: Sorcerer, Wizard
 *   - **Casting Time**: 1 action
 *   - **Range**: 150 feet
 *   - **Components**: V, S, M (bat guano)
 *   - **Duration**: Instantaneous
 *   - **Source**: 5.1 SRD (D&D 2014)
 *   [description paragraphs]
 *
 * Usage: node scripts/seedSpells.js
 * Idempotent — uses bulkWrite with upsert on slug.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import fs from 'fs';
import mongoose from 'mongoose';
import Spell from '../models/Spell.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

// ── Source folder config ──────────────────────────────────────
const SPELLS_5E_DIR = path.join(__dirname, '..', '..', 'spells', '5e');
const SPELLS_PF2E_DIR = path.join(__dirname, '..', '..', 'spells', 'pf2e');

const SOURCE_MAP_5E = {
  '5.1_srd':           { key: '5.1_srd',    label: '5.1 SRD (D&D 2014)' },
  '5.2_srd':           { key: '5.2_srd',    label: '5.2 SRD (D&D 2024)' },
  'deep_magic':        { key: 'deep_magic', label: 'Deep Magic 5e' },
  'level_up_advanced': { key: 'a5e',        label: 'Level Up Advanced 5e' },
};

const PF2E_SOURCE_LABELS = {
  crb: 'Core Rulebook', apg: "Advanced Player's Guide", som: 'Secrets of Magic',
  da: 'Dark Archive', tv: 'Treasure Vault', roe: 'Rage of Elements',
  pc1: 'Player Core', pc2: 'Player Core 2', botd: 'Book of the Dead',
  locg: 'Lost Omens Character Guide', logm: 'Lost Omens Gods & Magic',
  lowg: 'Lost Omens World Guide', loil: 'Lost Omens Impossible Lands',
  lokl: 'Lost Omens Knights of Lastwall', lol: 'Lost Omens Legends',
  lomm: 'Lost Omens Monsters of Myth', lopsg: 'Lost Omens Pathfinder Society Guide',
  lora: 'Lost Omens Rage of Elements', lohh: 'Lost Omens Highhelm',
  losk: "Lost Omens Shadowcaster's Guide", mal: 'Malevolence', tec: 'The Enmity Cycle',
  tok: 'Threshold of Knowledge', hotw: 'Howl of the Wild', woi: 'War of Immortals',
  sf0: 'Starfinder 2e Playtest',
};

// ── Slug from filename ───────────────────────────────────────
function slugFromFilename(filename) {
  return filename.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Parse level + school ─────────────────────────────────────
// 5e: "3 Evocation", "Cantrip Conjuration"
// PF2e: "Focus 3", "Spell 5"
function parseLevelSchool(raw, isPf2e = false) {
  if (!raw) return { level: null, school: null };
  const trimmed = raw.trim();

  // PF2e: "Focus 3" or "Spell 5"
  if (isPf2e) {
    const pf2eMatch = trimmed.match(/^(?:Focus|Spell|Cantrip)\s+(\d+)$/i);
    if (pf2eMatch) {
      return { level: parseInt(pf2eMatch[1]), school: null };
    }
    // "Cantrip" alone
    if (/^cantrip$/i.test(trimmed)) {
      return { level: 0, school: null };
    }
    // Fallback: try to extract a number
    const numMatch = trimmed.match(/(\d+)/);
    return { level: numMatch ? parseInt(numMatch[1]) : null, school: null };
  }

  // 5e: "Cantrip Conjuration"
  if (/^cantrip/i.test(trimmed)) {
    const school = trimmed.replace(/^cantrip\s*/i, '').trim();
    return { level: 0, school: school || null };
  }

  // 5e: "3 Evocation" or "5 conjuration"
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { level: parseInt(match[1]), school: match[2].trim() };
  }

  // Fallback: just a number
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    return { level: parseInt(numMatch[1]), school: null };
  }

  return { level: null, school: trimmed };
}

// ── PF2e field extraction ────────────────────────────────────
function parseTraits(md) {
  const match = md.match(/^\*([^*]+)\*$/m);
  if (!match) return [];
  return match[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

function normalizeActionCost(castStr) {
  if (!castStr) return null;
  if (castStr.includes('\u25C6\u25C6\u25C6')) return '3';
  if (castStr.includes('\u25C6\u25C6')) return '2';
  if (castStr.includes('\u25C6') && !castStr.includes('\u25C6\u25C6')) return '1';
  if (castStr.includes('\u25C8')) return 'reaction';
  if (castStr.includes('\u25C7')) return 'free';
  if (/1 to 3/i.test(castStr) || /2 or 3/i.test(castStr)) return '1 to 3';
  if (/varies/i.test(castStr)) return '1 to 3';
  if (/minute|hour/i.test(castStr)) return 'long';
  return null;
}

function deriveSpellType(levelLine) {
  if (!levelLine) return 'spell';
  const trimmed = levelLine.trim();
  if (/^Focus/i.test(trimmed)) return 'focus';
  if (/^Ritual/i.test(trimmed)) return 'ritual';
  if (/^Cantrip/i.test(trimmed)) return 'cantrip';
  return 'spell';
}

// ── Parse a single spell markdown ────────────────────────────
function parseSpellMarkdown(md, isPf2e = false) {
  const result = {};

  // Name: first # heading
  const nameMatch = md.match(/^#\s+(.+)$/m);
  result.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Extract metadata fields: - **Key**: Value
  function getField(key) {
    const regex = new RegExp(`^-\\s*\\*\\*${key}\\*\\*:\\s*(.+)$`, 'mi');
    const match = md.match(regex);
    return match ? match[1].trim() : null;
  }

  // Level + School
  const levelSchoolRaw = getField('Level');
  const { level, school } = parseLevelSchool(levelSchoolRaw, isPf2e);
  result.level = level;
  result.school = school;

  if (isPf2e) {
    // PF2e uses Traditions instead of Classes
    const traditionsRaw = getField('Traditions');
    result.classes = traditionsRaw
      ? traditionsRaw.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    result.castingTime = getField('Cast');
  } else {
    // 5e uses Classes
    const classesRaw = getField('Classes');
    result.classes = classesRaw
      ? classesRaw.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    result.castingTime = getField('Casting Time');
  }

  result.range = getField('Range');
  result.components = getField('Components');
  result.duration = getField('Duration');

  // PF2e-native fields
  if (isPf2e) {
    result.traditions = result.classes;
    result.traits = parseTraits(md);
    result.actionCost = normalizeActionCost(result.castingTime);
    result.spellType = deriveSpellType(getField('Level'));
    const RARITIES = ['uncommon', 'rare'];
    result.rarity = result.traits.find(t => RARITIES.includes(t)) || 'common';

    // PF2e cantrips are identified by the 'cantrip' trait, not the Level line.
    // The Level line says "Spell 1" but the trait line says *cantrip, evocation, ...*
    if (result.traits.includes('cantrip')) {
      result.level = 0;
      result.spellType = 'cantrip';
    }
  }

  return result;
}

// ── Process a single source folder ───────────────────────────
async function processFolder(folderPath, sourceKey, sourceLabel, gameSystem, isPf2e) {
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
  console.log(`\nProcessing: ${sourceLabel} (${files.length} files)`);
  let errors = 0;
  const ops = [];

  for (const file of files) {
    try {
      const md = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      const parsed = parseSpellMarkdown(md, isPf2e);
      const fileSlug = slugFromFilename(file);
      const slug = `${sourceKey}--${fileSlug}`;

      ops.push({
        updateOne: {
          filter: { slug },
          update: {
            $set: {
              name: parsed.name, slug, source: sourceLabel, sourceKey, gameSystem,
              level: parsed.level, school: parsed.school, classes: parsed.classes,
              castingTime: parsed.castingTime, range: parsed.range,
              components: parsed.components, duration: parsed.duration,
              traditions: parsed.traditions || [],
              traits: parsed.traits || [],
              actionCost: parsed.actionCost || null,
              spellType: parsed.spellType || null,
              rarity: parsed.rarity || null,
              rawMarkdown: md,
            },
          },
          upsert: true,
        },
      });
    } catch (err) { console.error(`  Error: ${file}: ${err.message}`); errors++; }
  }

  let upserted = 0;
  for (let i = 0; i < ops.length; i += 500) {
    const chunk = ops.slice(i, i + 500);
    const result = await Spell.bulkWrite(chunk);
    upserted += result.upsertedCount + result.modifiedCount;
  }
  console.log(`  Processed ${ops.length} spells from ${sourceLabel}`);
  return { upserted, errors };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set in .env'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let totalUpserted = 0;
  let totalErrors = 0;

  // Process 5e spells
  if (fs.existsSync(SPELLS_5E_DIR)) {
    const folders = fs.readdirSync(SPELLS_5E_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    for (const folder of folders) {
      const config = SOURCE_MAP_5E[folder];
      if (!config) { console.log(`  Skipping unknown 5e folder: ${folder}`); continue; }
      const result = await processFolder(
        path.join(SPELLS_5E_DIR, folder), config.key, config.label, '5e', false
      );
      totalUpserted += result.upserted;
      totalErrors += result.errors;
    }
  }

  // Process PF2e spells
  if (fs.existsSync(SPELLS_PF2E_DIR)) {
    const folders = fs.readdirSync(SPELLS_PF2E_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    for (const folder of folders) {
      const sourceKey = `pf2e_${folder}`;
      const sourceLabel = PF2E_SOURCE_LABELS[folder] || `PF2e ${folder.toUpperCase()}`;
      const result = await processFolder(
        path.join(SPELLS_PF2E_DIR, folder), sourceKey, sourceLabel, 'pf2e', true
      );
      totalUpserted += result.upserted;
      totalErrors += result.errors;
    }
  }

  console.log(`\nDone! ${totalUpserted} spells upserted, ${totalErrors} errors.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
