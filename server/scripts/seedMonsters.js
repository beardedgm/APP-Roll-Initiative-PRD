/**
 * seedMonsters.js — Parse all .md stat blocks from monsters/ and upsert into MongoDB.
 *
 * Supports 3 format families:
 *   1. Standard (5.1 SRD, CC, ToB1/2/3, A5E): score+mod ability table | 21 (+5) |
 *   2. SRD 5.2: 4-column ability table | STR | 21 | +5 | +5 |, explicit Initiative line
 *   3. Black Flag: modifier-only ability table | +5 |, no alignment
 *
 * Usage: node scripts/seedMonsters.js [--dry-run] [--fail-on-invalid]
 * Idempotent — uses bulkWrite with upsert on slug.
 * Self-cleaning — deletes DB docs whose markdown file is gone (guarded, scoped to seeded docs).
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import fs from 'fs';
import mongoose from 'mongoose';
import Monster from '../models/Monster.js';
import PF2E_SOURCE_LABELS from '../config/pf2eSourceLabels.js';
import { parseArgs, writeInBatches, reconcileStale, parsePf2eTraits, missingDirs } from './seedCore.js';
import { seedMonsterSchema, validateSeedRecords } from '../validators/seedContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

// ── Source folder config ──────────────────────────────────────
// Lowercase 'monsters' — the tracked dir name. A capitalized path works on
// case-insensitive Windows but finds NOTHING on Render's case-sensitive Linux
// FS (silently empty catalog), which becomes dangerous once stale-record
// reconciliation can delete based on the on-disk set.
const MONSTERS_DIR = path.join(__dirname, '..', '..', 'monsters');
const MONSTERS_5E_DIR = path.join(MONSTERS_DIR, '5e');
const MONSTERS_PF2E_DIR = path.join(MONSTERS_DIR, 'pf2e');

const SOURCE_MAP_5E = {
  '5.1_srd_(2015_mm)':       { key: '5.1_srd',   label: '5.1 SRD (2015 MM)', format: 'standard' },
  '5.2_srd_(2025_mm)':       { key: '5.2_srd',   label: '5.2 SRD (2025 MM)', format: '5.2' },
  'a5e_monstrous_menagerie': { key: 'a5e',        label: 'A5e Monstrous Menagerie', format: 'standard' },
  'black_flag':              { key: 'black_flag', label: 'Black Flag', format: 'black_flag' },
  'creature_codex':          { key: 'cc',         label: 'Creature Codex', format: 'standard' },
  'tome_of_beasts_2':        { key: 'tob2',       label: 'Tome of Beasts 2', format: 'standard' },
  'tome_of_beasts_2023':     { key: 'tob1',       label: 'Tome of Beasts 2023', format: 'standard' },
  'tome_of_beasts_3':        { key: 'tob3',       label: 'Tome of Beasts 3', format: 'standard' },
};

// ── CR string → numeric ──────────────────────────────────────
function parseCR(crStr) {
  if (!crStr) return 0;
  const s = crStr.trim();
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return den ? num / den : 0;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ── Slug from filename ───────────────────────────────────────
function slugFromFilename(filename) {
  return filename.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Parse standard format (5.1 SRD, CC, ToB, A5E) ───────────
function parseStandard(md, _sourceKey) {
  const lines = md.split('\n');
  const result = { abilities: {} };

  // Name: first # heading
  const nameMatch = md.match(/^#\s+(.+)$/m);
  result.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Size/Type/Alignment: *Size* *Type* *alignment* OR *Size* *Type*
  const sizeTypeLine = lines.find(l => /^\*[A-Z]/.test(l) && !l.startsWith('**'));
  if (sizeTypeLine) {
    // Extract italic segments
    const parts = sizeTypeLine.match(/\*([^*]+)\*/g);
    if (parts) {
      const cleaned = parts.map(p => p.replace(/\*/g, '').trim());
      result.size = cleaned[0] || '';
      result.type = cleaned[1] || '';
      result.alignment = cleaned.slice(2).join(' ') || '';
    }
  }

  // AC
  const acMatch = md.match(/\*\*Armor Class:?\*\*\s*(\d+)\s*(.*)/i);
  if (acMatch) {
    result.ac = parseInt(acMatch[1]);
    result.acDesc = acMatch[2] ? acMatch[2].replace(/^\(|\)$/g, '').trim() : '';
  }

  // HP
  const hpMatch = md.match(/\*\*Hit Points:?\*\*\s*(\d+)\s*(?:\(([^)]+)\))?/i);
  if (hpMatch) {
    result.hp = parseInt(hpMatch[1]);
    result.hpFormula = hpMatch[2] ? hpMatch[2].trim() : '';
  }

  // CR
  const crMatch = md.match(/\*\*Challenge Rating:?\*\*\s*([\d/]+)/i);
  if (crMatch) {
    result.cr = crMatch[1];
    result.crNumeric = parseCR(crMatch[1]);
  }

  // Ability scores: | 21 (+5) | 9 (-1) | ...
  const abilityLine = lines.find(l => /\|\s*\d+\s*\([+-]\d+\)/.test(l));
  if (abilityLine) {
    const scores = abilityLine.match(/\d+\s*\([+-]?\d+\)/g);
    const abilityNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    if (scores) {
      scores.forEach((s, i) => {
        if (abilityNames[i]) {
          result.abilities[abilityNames[i]] = parseInt(s);
        }
      });
    }
  }

  // Init modifier: derive from DEX
  result.initMod = result.abilities.dex
    ? Math.floor((result.abilities.dex - 10) / 2)
    : 0;

  return result;
}

// ── Parse 5.2 SRD format ─────────────────────────────────────
function parse52(md) {
  const lines = md.split('\n');
  const result = { abilities: {} };

  // Name
  const nameMatch = md.match(/^#\s+(.+)$/m);
  result.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Size/Type/Alignment: *Large Aberration, Lawful Evil*
  const sizeTypeLine = lines.find(l => /^\*[A-Z]/.test(l) && !l.startsWith('**'));
  if (sizeTypeLine) {
    const inner = sizeTypeLine.replace(/^\*|\*$/g, '').trim();
    // Split on comma — first part is "Size Type", rest is alignment
    const commaIdx = inner.indexOf(',');
    if (commaIdx !== -1) {
      const sizeType = inner.slice(0, commaIdx).trim();
      result.alignment = inner.slice(commaIdx + 1).trim();
      const spaceIdx = sizeType.indexOf(' ');
      result.size = sizeType.slice(0, spaceIdx).trim();
      result.type = sizeType.slice(spaceIdx + 1).trim();
    } else {
      const spaceIdx = inner.indexOf(' ');
      result.size = inner.slice(0, spaceIdx).trim();
      result.type = inner.slice(spaceIdx + 1).trim();
      result.alignment = '';
    }
  }

  // AC
  const acMatch = md.match(/\*\*Armor Class:?\*\*\s*(\d+)\s*(.*)/i);
  if (acMatch) {
    result.ac = parseInt(acMatch[1]);
    result.acDesc = acMatch[2] ? acMatch[2].replace(/^\(|\)$/g, '').trim() : '';
  }

  // HP
  const hpMatch = md.match(/\*\*Hit Points:?\*\*\s*(\d+)\s*(?:\(([^)]+)\))?/i);
  if (hpMatch) {
    result.hp = parseInt(hpMatch[1]);
    result.hpFormula = hpMatch[2] ? hpMatch[2].trim() : '';
  }

  // CR: **CR** 10 (XP 5,900...)
  const crMatch = md.match(/\*\*CR\*?\*?\s*([\d/]+)/i);
  if (crMatch) {
    result.cr = crMatch[1];
    result.crNumeric = parseCR(crMatch[1]);
  }

  // Initiative: **Initiative**: +7 (17)
  const initMatch = md.match(/\*\*Initiative\*\*:?\s*([+-]?\d+)/i);
  if (initMatch) {
    result.initMod = parseInt(initMatch[1]);
  }

  // Ability scores: 4-column table | STR | 21 | +5 | +5 |
  for (const line of lines) {
    const m = line.match(/\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(\d+)\s*\|/i);
    if (m) {
      const ability = m[1].toLowerCase();
      result.abilities[ability] = parseInt(m[2]);
    }
  }

  // Fallback initMod from DEX if not explicitly set
  if (result.initMod === undefined && result.abilities.dex) {
    result.initMod = Math.floor((result.abilities.dex - 10) / 2);
  }

  return result;
}

// ── Parse Black Flag format ──────────────────────────────────
function parseBlackFlag(md) {
  const lines = md.split('\n');
  const result = { abilities: {} };

  // Name
  const nameMatch = md.match(/^#\s+(.+)$/m);
  result.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Size/Type (no alignment): *Large* *Aberration*
  const sizeTypeLine = lines.find(l => /^\*[A-Z]/.test(l) && !l.startsWith('**'));
  if (sizeTypeLine) {
    const parts = sizeTypeLine.match(/\*([^*]+)\*/g);
    if (parts) {
      const cleaned = parts.map(p => p.replace(/\*/g, '').trim());
      result.size = cleaned[0] || '';
      result.type = cleaned[1] || '';
    }
  }
  result.alignment = '';

  // AC
  const acMatch = md.match(/\*\*Armor Class:?\*\*\s*(\d+)\s*(.*)/i);
  if (acMatch) {
    result.ac = parseInt(acMatch[1]);
    result.acDesc = acMatch[2] ? acMatch[2].replace(/^\(|\)$/g, '').trim() : '';
  }

  // HP
  const hpMatch = md.match(/\*\*Hit Points:?\*\*\s*(\d+)\s*(?:\(([^)]+)\))?/i);
  if (hpMatch) {
    result.hp = parseInt(hpMatch[1]);
    result.hpFormula = hpMatch[2] ? hpMatch[2].trim() : '';
  }

  // CR
  const crMatch = md.match(/\*\*Challenge Rating:?\*\*\s*([\d/]+)/i);
  if (crMatch) {
    result.cr = crMatch[1];
    result.crNumeric = parseCR(crMatch[1]);
  }

  // Abilities: modifier-only table | +5 | -1 | +6 | +8 | +6 | +4 |
  const headerLine = lines.findIndex(l => /\|\s*STR\s*\|/.test(l));
  if (headerLine !== -1) {
    // The modifier row is 2 lines after header (skip the separator)
    const modLine = lines[headerLine + 2];
    if (modLine) {
      const mods = modLine.match(/[+-]?\d+/g);
      const abilityNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      if (mods) {
        mods.forEach((m, i) => {
          if (abilityNames[i]) {
            // Convert modifier back to approximate score
            const mod = parseInt(m);
            result.abilities[abilityNames[i]] = 10 + mod * 2;
          }
        });
      }
    }
  }

  // Init modifier from DEX
  const dexMod = result.abilities.dex ? Math.floor((result.abilities.dex - 10) / 2) : 0;
  result.initMod = dexMod;

  return result;
}

// ── Parse PF2e format ───────────────────────────────────────
function parsePf2e(md) {
  const lines = md.split('\n');
  const result = { abilities: {} };

  // Name: first # heading
  const nameMatch = md.match(/^#\s+(.+)$/m);
  result.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Level: *Creature N* → store as cr (string) and crNumeric (int)
  const levelMatch = md.match(/\*Creature\s+(-?\d+)\*/i);
  if (levelMatch) {
    result.cr = levelMatch[1];
    result.crNumeric = parseInt(levelMatch[1]);
  }

  // Traits line: between *Creature N* and first ---
  // Find the creature line index, then collect italicized trait segments before the first ---
  const creatureLine = lines.findIndex(l => /\*Creature\s+-?\d+\*/i.test(l));
  if (creatureLine !== -1) {
    const separatorIdx = lines.findIndex((l, i) => i > creatureLine && /^---/.test(l));
    const traitLines = lines.slice(creatureLine + 1, separatorIdx !== -1 ? separatorIdx : creatureLine + 5);
    const traitsText = traitLines.join(' ');

    // Traits are a plain-text, comma-separated line with no markup, e.g.
    // "uncommon, n, large, beast" — parse size + creature type from it (f20).
    const { size, type } = parsePf2eTraits(traitsText);
    result.size = size;
    result.type = type;
  }

  // Alignment: PF2e uses traits — store empty string
  result.alignment = '';

  // AC: **AC** N
  const acMatch = md.match(/\*\*AC\*\*\s*(\d+)/i);
  if (acMatch) {
    result.ac = parseInt(acMatch[1]);
    result.acDesc = '';
  }

  // HP: **HP** N
  const hpMatch = md.match(/\*\*HP\*\*\s*(\d+)/i);
  if (hpMatch) {
    result.hp = parseInt(hpMatch[1]);
    result.hpFormula = '';
  }

  // Perception: **Perception** +N → initMod
  const perceptionMatch = md.match(/\*\*Perception\*\*\s*([+-]?\d+)/i);
  if (perceptionMatch) {
    result.initMod = parseInt(perceptionMatch[1]);
  }

  // Ability modifiers: **STR** +N, **DEX** +N, **CON** +N, **INT** +N, **WIS** +N, **CHA** +N
  const abilityNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  for (const ability of abilityNames) {
    const abilityRegex = new RegExp(`\\*\\*${ability}\\*\\*\\s*([+-]?\\d+)`, 'i');
    const abilityMatch = md.match(abilityRegex);
    if (abilityMatch) {
      result.abilities[ability] = parseInt(abilityMatch[1]);
    }
  }

  return result;
}

// ── Process a folder of .md files into records ───────────────
// Records are collected (not written) so validation can run first.
// onDiskSlugs is populated from filenames regardless of parse success.
function processFolder(folderPath, config, records, stats) {
  if (!fs.existsSync(folderPath)) {
    // Unreachable after the preflight in seed(), but keep it fatal: a missing
    // configured folder means its slugs never enter onDiskSlugs, and the
    // reconcile step would then delete that whole book from the catalog.
    throw new Error(`Configured source folder missing: ${folderPath}`);
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
  console.log(`  ${config.label}: ${files.length} files`);

  for (const file of files) {
    const slug = `${config.key}--${slugFromFilename(file)}`;
    // Two files that map to the same slug silently overwrite each other on
    // upsert — warn so the collision is visible instead of silent (l12).
    if (stats.onDiskSlugs.has(slug)) {
      console.warn(`  DUPLICATE SLUG: ${slug} (${file}) — a later file overwrites an earlier one`);
    }
    // Always register slug from filename so parse failure never triggers deletion
    stats.onDiskSlugs.add(slug);

    try {
      const md = fs.readFileSync(path.join(folderPath, file), 'utf8');

      let parsed;
      if (config.format === 'pf2e') {
        parsed = parsePf2e(md);
      } else if (config.format === '5.2') {
        parsed = parse52(md);
      } else if (config.format === 'black_flag') {
        parsed = parseBlackFlag(md);
      } else {
        parsed = parseStandard(md, config.key);
      }

      records.push({
        file,
        doc: {
          name: parsed.name,
          slug,
          source: config.label,
          sourceKey: config.key,
          gameSystem: config.gameSystem || '5e',
          cr: parsed.cr,
          crNumeric: parsed.crNumeric,
          hp: parsed.hp,
          hpFormula: parsed.hpFormula || '',
          ac: parsed.ac,
          acDesc: parsed.acDesc || '',
          initMod: parsed.initMod || 0,
          size: parsed.size || '',
          type: parsed.type || '',
          alignment: parsed.alignment || '',
          abilities: parsed.abilities || {},
          rawMarkdown: md,
        },
      });

      stats.totalFiles++;
    } catch (err) {
      console.error(`  ERROR reading/parsing ${file}: ${err.message}`);
      stats.errors++;
    }
  }
}

// ── Main seed function ───────────────────────────────────────
async function seed() {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun) console.log('[DRY RUN] No writes will occur.\n');

  // ── Preflight: every CONFIGURED source folder must exist ─────
  // Runs BEFORE the DB connection so a broken checkout (renamed/missing
  // folder) can never reach the reconcile step, which would silently delete
  // that folder's whole book — most single books fall under the 10% guard.
  // Extra folders on disk are fine; configured-but-absent is fatal.
  const requiredDirs = [
    MONSTERS_5E_DIR,
    MONSTERS_PF2E_DIR,
    ...Object.keys(SOURCE_MAP_5E).map(f => path.join(MONSTERS_5E_DIR, f)),
  ];
  const missing = missingDirs(requiredDirs);
  if (missing.length) {
    console.error('FATAL: configured source folder(s) missing — aborting before any write/reconcile:');
    for (const m of missing) console.error(`  ${m}`);
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  const records = [];
  const stats = { totalFiles: 0, errors: 0, onDiskSlugs: new Set() };

  // ── 5e sources (from monsters/5e/) ──
  console.log('5e sources:');
  for (const [folder, config] of Object.entries(SOURCE_MAP_5E)) {
    const folderPath = path.join(MONSTERS_5E_DIR, folder);
    processFolder(folderPath, config, records, stats);
  }

  // ── PF2e sources (from monsters/pf2e/) ──
  // Parent dir existence is guaranteed by the preflight; individual folders
  // are discovered from disk, so a deliberately removed PF2e folder is a
  // legitimate content removal (still covered by the 10% guard + --dry-run).
  console.log('\nPF2e sources:');
  const pf2eFolders = fs.readdirSync(MONSTERS_PF2E_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  for (const folder of pf2eFolders) {
    const sourceKey = `pf2e_${folder}`;
    const label = PF2E_SOURCE_LABELS[folder] || `PF2e ${folder.toUpperCase()}`;
    const config = {
      key: sourceKey,
      label,
      format: 'pf2e',
      gameSystem: 'pf2e',
    };
    const folderPath = path.join(MONSTERS_PF2E_DIR, folder);
    processFolder(folderPath, config, records, stats);
  }

  console.log(`\nScanned ${stats.totalFiles} monsters (${stats.errors} read/parse errors).`);

  // ── Validate ─────────────────────────────────────────────────
  const { valid, invalid } = validateSeedRecords(records, seedMonsterSchema);
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
  const writeReport = await writeInBatches(Monster, ops, { dryRun: args.dryRun });

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
  console.log('\nReconciling stale docs...');
  const reconcile = await reconcileStale(Monster, {
    onDiskSlugs: stats.onDiskSlugs,
    scopeFilter: { isCustom: false },
    dryRun: args.dryRun,
    deleteThreshold: args.deleteThreshold,
    log: console.log,
  });

  if (reconcile.aborted) {
    console.error(`Reconcile aborted: stale=${reconcile.stale} docs flagged for deletion.`);
  } else if (args.dryRun) {
    console.log(`DRY RUN: ${reconcile.stale} stale docs found.`);
  } else {
    console.log(`Reconcile: deleted ${reconcile.deleted} stale docs (${reconcile.stale} identified).`);
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n── Seed Summary ──');
  console.log(`  Files scanned:   ${stats.totalFiles}`);
  console.log(`  Read errors:     ${stats.errors}`);
  console.log(`  Valid records:   ${valid.length}`);
  console.log(`  Invalid records: ${invalid.length}`);
  if (!args.dryRun) {
    console.log(`  Upserted:        ${writeReport.upserted}`);
    console.log(`  Modified:        ${writeReport.modified}`);
    console.log(`  Batch errors:    ${writeReport.batchErrors.length}`);
    console.log(`  Stale deleted:   ${reconcile.deleted}`);
  }

  // ── Exit code ────────────────────────────────────────────────
  // --fail-on-invalid must also fail on read/parse errors, not just schema
  // validation failures — a file that can't be read is as bad as an invalid one (l13).
  if (reconcile.aborted || writeReport.batchErrors.length > 0
      || (args.failOnInvalid && (invalid.length > 0 || stats.errors > 0))) {
    process.exitCode = 1;
  }

  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
  mongoose.connection.close().catch(() => {});
});
