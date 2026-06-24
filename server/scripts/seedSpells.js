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
 * Usage: node scripts/seedSpells.js [--dry-run] [--fail-on-invalid]
 * Idempotent — uses bulkWrite with upsert on slug.
 * Self-cleaning — deletes DB docs whose markdown file is gone (guarded, whole collection scoped).
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import fs from 'fs';
import mongoose from 'mongoose';
import Spell from '../models/Spell.js';
import PF2E_SOURCE_LABELS from '../config/pf2eSourceLabels.js';
import { parseArgs, writeInBatches, reconcileStale } from './seedCore.js';
import { seedSpellSchema, validateSeedRecords } from '../validators/seedContent.js';

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
  if (castStr.includes('◆◆◆')) return '3';
  if (castStr.includes('◆◆')) return '2';
  if (castStr.includes('◆') && !castStr.includes('◆◆')) return '1';
  if (castStr.includes('◈')) return 'reaction';
  if (castStr.includes('◇')) return 'free';
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

// ── Process a single source folder into records ───────────────
// onDiskSlugs is populated from filenames regardless of parse success.
function processFolder(folderPath, sourceKey, sourceLabel, gameSystem, isPf2e, records, onDiskSlugs) {
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
  console.log(`\nProcessing: ${sourceLabel} (${files.length} files)`);
  let errors = 0;

  for (const file of files) {
    const fileSlug = slugFromFilename(file);
    const slug = `${sourceKey}--${fileSlug}`;
    // Always register slug from filename so parse failure never triggers deletion
    onDiskSlugs.add(slug);

    try {
      const md = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      const parsed = parseSpellMarkdown(md, isPf2e);

      records.push({
        file,
        doc: {
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
          traditions: parsed.traditions || [],
          traits: parsed.traits || [],
          actionCost: parsed.actionCost || null,
          spellType: parsed.spellType || null,
          rarity: parsed.rarity || null,
          rawMarkdown: md,
        },
      });
    } catch (err) {
      console.error(`  Error: ${file}: ${err.message}`);
      errors++;
    }
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun) console.log('[DRY RUN] No writes will occur.\n');

  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set in .env'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const records = [];
  const onDiskSlugs = new Set();
  let totalReadErrors = 0;

  // Process 5e spells
  if (fs.existsSync(SPELLS_5E_DIR)) {
    const folders = fs.readdirSync(SPELLS_5E_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    for (const folder of folders) {
      const config = SOURCE_MAP_5E[folder];
      if (!config) { console.log(`  Skipping unknown 5e folder: ${folder}`); continue; }
      totalReadErrors += processFolder(
        path.join(SPELLS_5E_DIR, folder), config.key, config.label, '5e', false, records, onDiskSlugs
      );
    }
  }

  // Process PF2e spells
  if (fs.existsSync(SPELLS_PF2E_DIR)) {
    const folders = fs.readdirSync(SPELLS_PF2E_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    for (const folder of folders) {
      const sourceKey = `pf2e_${folder}`;
      const sourceLabel = PF2E_SOURCE_LABELS[folder] || `PF2e ${folder.toUpperCase()}`;
      totalReadErrors += processFolder(
        path.join(SPELLS_PF2E_DIR, folder), sourceKey, sourceLabel, 'pf2e', true, records, onDiskSlugs
      );
    }
  }

  console.log(`\nScanned ${records.length} spells (${totalReadErrors} read/parse errors).`);

  // ── Validate ─────────────────────────────────────────────────
  const { valid, invalid } = validateSeedRecords(records, seedSpellSchema);
  console.log(`Validation: ${valid.length} valid, ${invalid.length} invalid.`);
  if (invalid.length > 0) {
    console.warn('\nInvalid records (will be skipped):');
    for (const r of invalid) {
      console.warn(`  [${r.file}] ${r.slug}`);
      for (const issue of r.issues) {
        console.warn(`    - ${issue}`);
      }
    }
  }

  // ── Write valid records ──────────────────────────────────────
  const ops = valid.map(r => ({
    updateOne: {
      filter: { slug: r.doc.slug },
      update: { $set: r.doc },
      upsert: true,
    },
  }));

  console.log('\nWriting to MongoDB...');
  const writeReport = await writeInBatches(Spell, ops, { dryRun: args.dryRun });

  if (args.dryRun) {
    console.log(`DRY RUN: would write ${writeReport.wouldWrite} upsert operations.`);
  } else {
    console.log(`Upserted: ${writeReport.upserted}, Modified: ${writeReport.modified}`);
    if (writeReport.batchErrors.length > 0) {
      console.error('Batch errors:');
      for (const e of writeReport.batchErrors) {
        console.error(`  Batch starting at ${e.batchStart}: ${e.message}`);
      }
    }
  }

  // ── Reconcile stale docs ─────────────────────────────────────
  // No custom spells exist, so scopeFilter is the whole collection ({})
  console.log('\nReconciling stale docs...');
  const reconcile = await reconcileStale(Spell, {
    onDiskSlugs,
    scopeFilter: {},
    dryRun: args.dryRun,
    deleteThreshold: args.deleteThreshold,
    log: console.log,
  });

  if (reconcile.aborted) {
    console.error(`Reconcile aborted: ${reconcile.stale} stale docs flagged for deletion.`);
  } else if (args.dryRun) {
    console.log(`DRY RUN: ${reconcile.stale} stale docs found.`);
  } else {
    console.log(`Reconcile: deleted ${reconcile.deleted} stale docs (${reconcile.stale} identified).`);
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n── Seed Summary ──');
  console.log(`  Files scanned:   ${records.length}`);
  console.log(`  Read errors:     ${totalReadErrors}`);
  console.log(`  Valid records:   ${valid.length}`);
  console.log(`  Invalid records: ${invalid.length}`);
  if (!args.dryRun) {
    console.log(`  Upserted:        ${writeReport.upserted}`);
    console.log(`  Modified:        ${writeReport.modified}`);
    console.log(`  Batch errors:    ${writeReport.batchErrors.length}`);
    console.log(`  Stale deleted:   ${reconcile.deleted}`);
  }

  // ── Exit code ────────────────────────────────────────────────
  if (reconcile.aborted || writeReport.batchErrors.length > 0 || (args.failOnInvalid && invalid.length > 0)) {
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
  mongoose.connection.close().catch(() => {});
});
