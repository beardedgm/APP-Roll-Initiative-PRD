/**
 * seedMonsters.js — Parse all .md stat blocks from Monsters/ and upsert into MongoDB.
 *
 * Supports 3 format families:
 *   1. Standard (5.1 SRD, CC, ToB1/2/3, A5E): score+mod ability table | 21 (+5) |
 *   2. SRD 5.2: 4-column ability table | STR | 21 | +5 | +5 |, explicit Initiative line
 *   3. Black Flag: modifier-only ability table | +5 |, no alignment
 *
 * Usage: node scripts/seedMonsters.js
 * Idempotent — uses bulkWrite with upsert on slug.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import fs from 'fs';
import mongoose from 'mongoose';
import Monster from '../models/Monster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

// ── Source folder config ──────────────────────────────────────
const MONSTERS_DIR = path.join(__dirname, '..', '..', 'Monsters');

const SOURCE_MAP = {
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

    // Extract all italic/bold-italic trait segments
    const traitMatches = traitsText.match(/\*\*?([^*]+)\*\*?/g);
    if (traitMatches) {
      const traits = traitMatches.map(t => t.replace(/\*+/g, '').trim()).filter(Boolean);
      // Size is typically first (Tiny, Small, Medium, Large, Huge, Gargantuan)
      const sizeWords = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
      const sizeMatch = traits.find(t => sizeWords.includes(t.toLowerCase()));
      result.size = sizeMatch || '';
      // Type is the remaining traits joined (creature type traits)
      result.type = traits.filter(t => t !== sizeMatch).join(', ');
    }
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

// ── Build source map (static + auto-detected pf2e_ folders) ─
function buildSourceMap() {
  const map = { ...SOURCE_MAP };

  if (!fs.existsSync(MONSTERS_DIR)) return map;

  const entries = fs.readdirSync(MONSTERS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('pf2e_')) continue;
    if (map[entry.name]) continue; // don't overwrite if already defined

    // e.g. pf2e_b1 → label "PF2e B1"
    const suffix = entry.name.slice(5).toUpperCase(); // strip "pf2e_"
    map[entry.name] = {
      key: entry.name,
      label: `PF2e ${suffix}`,
      format: 'pf2e',
      gameSystem: 'pf2e',
    };
  }

  return map;
}

// ── Main seed function ───────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  const ops = [];
  let totalFiles = 0;
  let errors = 0;

  const sourceMap = buildSourceMap();

  for (const [folder, config] of Object.entries(sourceMap)) {
    const folderPath = path.join(MONSTERS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`  Skipping missing folder: ${folder}`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    console.log(`  ${config.label}: ${files.length} files`);

    for (const file of files) {
      try {
        const md = fs.readFileSync(path.join(folderPath, file), 'utf8');
        const slug = `${config.key}--${slugFromFilename(file)}`;

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

        ops.push({
          updateOne: {
            filter: { slug },
            update: {
              $set: {
                name: parsed.name,
                slug,
                source: config.label,
                sourceKey: config.key,
                gameSystem: config.gameSystem || '5e',
                cr: parsed.cr || '',
                crNumeric: parsed.crNumeric || 0,
                hp: parsed.hp || 0,
                hpFormula: parsed.hpFormula || '',
                ac: parsed.ac || 10,
                acDesc: parsed.acDesc || '',
                initMod: parsed.initMod || 0,
                size: parsed.size || '',
                type: parsed.type || '',
                alignment: parsed.alignment || '',
                abilities: parsed.abilities || {},
                rawMarkdown: md,
              },
            },
            upsert: true,
          },
        });

        totalFiles++;
      } catch (err) {
        console.error(`  ERROR parsing ${file}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nParsed ${totalFiles} monsters (${errors} errors).`);
  console.log('Writing to MongoDB...');

  // bulkWrite in batches of 500
  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);
    const result = await Monster.bulkWrite(batch);
    written += result.upsertedCount + result.modifiedCount;
  }

  console.log(`Done. ${written} documents upserted/modified.`);
  console.log(`Total in DB: ${await Monster.countDocuments()}`);

  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
