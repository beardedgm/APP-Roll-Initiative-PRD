/**
 * seedSpells.js — Parse all .md spell files from spells/ and upsert into MongoDB.
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
const SPELLS_DIR = path.join(__dirname, '..', '..', 'spells');

const SOURCE_MAP = {
  '5.1_srd_5e':             { key: '5.1_srd',       label: '5.1 SRD (D&D 2014)', system: '5e' },
  '5.2_srd_5e':             { key: '5.2_srd',       label: '5.2 SRD (D&D 2024)', system: '5e' },
  'deep_magic_5e':          { key: 'deep_magic',    label: 'Deep Magic 5e', system: '5e' },
  'level_up_advanced_5e':   { key: 'a5e',           label: 'Level Up Advanced 5e', system: '5e' },
};

// PF2e source codes → labels (auto-detected from pf2e_ prefix folders)
const PF2E_SOURCE_LABELS = {
  crb: 'Core Rulebook', apg: 'Advanced Player\'s Guide', som: 'Secrets of Magic',
  da: 'Dark Archive', tv: 'Treasure Vault', roe: 'Rage of Elements',
  pc1: 'Player Core', pc2: 'Player Core 2', botd: 'Book of the Dead',
  locg: 'Lost Omens Character Guide', logm: 'Lost Omens Gods & Magic',
  lowg: 'Lost Omens World Guide', loil: 'Lost Omens Impossible Lands',
  lokl: 'Lost Omens Knights of Lastwall', lol: 'Lost Omens Legends',
  lomm: 'Lost Omens Monsters of Myth', lopsg: 'Lost Omens Pathfinder Society Guide',
  lora: 'Lost Omens Rage of Elements', lohh: 'Lost Omens Highhelm',
  losk: 'Lost Omens Shadowcaster\'s Guide', mal: 'Malevolence', tec: 'The Enmity Cycle',
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

  return result;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let totalUpserted = 0;
  let totalErrors = 0;

  // Process each source folder
  const folders = fs.readdirSync(SPELLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const folder of folders) {
    let sourceKey, sourceLabel, gameSystem, isPf2e;

    const sourceConfig = SOURCE_MAP[folder];
    if (sourceConfig) {
      sourceKey = sourceConfig.key;
      sourceLabel = sourceConfig.label;
      gameSystem = sourceConfig.system;
      isPf2e = false;
    } else if (folder.startsWith('pf2e_')) {
      // Auto-detect PF2e spell folders (created by convertPf2eSpells.js)
      const rawCode = folder.replace('pf2e_', '');
      sourceKey = folder;  // e.g. "pf2e_crb"
      sourceLabel = PF2E_SOURCE_LABELS[rawCode] || `PF2e ${rawCode.toUpperCase()}`;
      gameSystem = 'pf2e';
      isPf2e = true;
    } else {
      console.log(`  Skipping unknown folder: ${folder}`);
      continue;
    }

    const folderPath = path.join(SPELLS_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    console.log(`\nProcessing: ${sourceLabel} (${files.length} files)`);

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
                name: parsed.name,
                slug,
                source: sourceLabel,
                sourceKey,
                gameSystem,
                level: parsed.level,
                school: parsed.school,
                classes: parsed.classes,
                castingTime: parsed.castingTime,
                range: parsed.range,
                components: parsed.components,
                duration: parsed.duration,
                rawMarkdown: md,
              },
            },
            upsert: true,
          },
        });
      } catch (err) {
        console.error(`  Error parsing ${file}: ${err.message}`);
        totalErrors++;
      }
    }

    // Bulk write in chunks of 500
    for (let i = 0; i < ops.length; i += 500) {
      const chunk = ops.slice(i, i + 500);
      const result = await Spell.bulkWrite(chunk);
      totalUpserted += result.upsertedCount + result.modifiedCount;
    }

    console.log(`  Processed ${ops.length} spells from ${sourceLabel}`);
  }

  console.log(`\nDone! ${totalUpserted} spells upserted, ${totalErrors} errors.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
