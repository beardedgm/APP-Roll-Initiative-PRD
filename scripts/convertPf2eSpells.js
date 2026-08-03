/**
 * Convert PF2eTools spell JSON files to markdown.
 *
 * Usage:
 *   node scripts/convertPf2eSpells.js <path-to-pf2etools-spells-dir>
 *
 * Example:
 *   node scripts/convertPf2eSpells.js ../Pf2eTools/data/spells
 *
 * Reads: spells-*.json files from the provided directory
 * Writes: spells/pf2e/{sourceKey}/{slug}.md files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPf2eSpellToMarkdown } from '../shared/pf2eSpellRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPELLS_DIR = path.join(__dirname, '..', 'spells');

function sourceToKey(sourceCode) {
  return `pf2e_${sourceCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function main() {
  const spellsDir = process.argv[2];
  if (!spellsDir) {
    console.error('Usage: node scripts/convertPf2eSpells.js <path-to-pf2etools-spells-dir>');
    console.error('Example: node scripts/convertPf2eSpells.js ../Pf2eTools/data/spells');
    process.exit(1);
  }

  const resolvedDir = path.resolve(spellsDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(resolvedDir)
    .filter(f => f.startsWith('spells-') && f.endsWith('.json'))
    .sort();

  console.log(`Found ${jsonFiles.length} spell files in ${resolvedDir}`);

  let totalSpells = 0;
  let totalErrors = 0;
  const writtenPaths = new Set(); // detect same-run slug collisions (l5)
  const sourceStats = {};

  for (const jsonFile of jsonFiles) {
    const filePath = path.join(resolvedDir, jsonFile);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`  ERROR reading ${jsonFile}: ${err.message}`);
      totalErrors++;
      continue;
    }

    const spells = data.spell || [];
    if (spells.length === 0) {
      console.log(`  ${jsonFile}: no spells`);
      continue;
    }

    console.log(`  ${jsonFile}: ${spells.length} spells`);

    for (const spell of spells) {
      try {
        const sourceCode = spell.source || 'unknown';
        const sourceKey = sourceToKey(sourceCode);
        const slug = slugify(spell.name);

        const shortKey = sourceCode.toLowerCase().replace(/[^a-z0-9]/g, '');
        const outDir = path.join(SPELLS_DIR, 'pf2e', shortKey);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        const markdown = renderPf2eSpellToMarkdown(spell);
        const outPath = path.join(outDir, `${slug}.md`);
        // Two names that slugify identically silently clobber each other's
        // file — and the seed's DUPLICATE SLUG guard can't catch it because
        // the data is lost before the seed ever sees two files. Warn here (l5).
        if (writtenPaths.has(outPath)) {
          console.warn(`  DUPLICATE SLUG: ${outPath} ("${spell.name}") — overwriting an earlier spell from this run`);
        }
        writtenPaths.add(outPath);
        fs.writeFileSync(outPath, markdown, 'utf8');

        totalSpells++;
        sourceStats[sourceKey] = (sourceStats[sourceKey] || 0) + 1;
      } catch (err) {
        console.error(`  ERROR converting ${spell.name || 'unknown'}: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\nDone. Converted ${totalSpells} spells (${totalErrors} errors).`);
  console.log('\nPer-source breakdown:');
  for (const [key, count] of Object.entries(sourceStats).sort()) {
    console.log(`  ${key}: ${count}`);
  }
}

main();
