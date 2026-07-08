/**
 * Convert PF2eTools bestiary JSON files to markdown stat blocks.
 *
 * Usage:
 *   node scripts/convertPf2eToMarkdown.js <path-to-pf2etools-bestiary-dir>
 *
 * Example:
 *   node scripts/convertPf2eToMarkdown.js ../Pf2eTools/data/bestiary
 *
 * Reads: creatures-*.json files from the provided directory
 * Writes: monsters/pf2e/{sourceKey}/{slug}.md files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPf2eCreatureToMarkdown } from '../shared/pf2eMarkdownRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Lowercase 'monsters' — the tracked dir name. A capitalized 'Monsters' resolves
// on case-insensitive Windows/macOS but writes to a DIFFERENT dir on Render's
// case-sensitive Linux FS, so the converted files never reach the seeded set.
const MONSTERS_DIR = path.join(__dirname, '..', 'monsters');

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
  const bestiaryDir = process.argv[2];
  if (!bestiaryDir) {
    console.error('Usage: node scripts/convertPf2eToMarkdown.js <path-to-pf2etools-bestiary-dir>');
    console.error('Example: node scripts/convertPf2eToMarkdown.js ../Pf2eTools/data/bestiary');
    process.exit(1);
  }

  const resolvedDir = path.resolve(bestiaryDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(resolvedDir)
    .filter(f => f.startsWith('creatures-') && f.endsWith('.json'))
    .sort();

  console.log(`Found ${jsonFiles.length} bestiary files in ${resolvedDir}`);

  let totalCreatures = 0;
  let totalErrors = 0;
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

    const creatures = data.creature || [];
    if (creatures.length === 0) {
      console.log(`  ${jsonFile}: no creatures`);
      continue;
    }

    console.log(`  ${jsonFile}: ${creatures.length} creatures`);

    for (const creature of creatures) {
      try {
        const sourceCode = creature.source || 'unknown';
        const sourceKey = sourceToKey(sourceCode);
        const slug = slugify(creature.name);

        const shortKey = sourceCode.toLowerCase().replace(/[^a-z0-9]/g, '');
        const outDir = path.join(MONSTERS_DIR, 'pf2e', shortKey);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        const markdown = renderPf2eCreatureToMarkdown(creature);
        const outPath = path.join(outDir, `${slug}.md`);
        fs.writeFileSync(outPath, markdown, 'utf8');

        totalCreatures++;
        sourceStats[sourceKey] = (sourceStats[sourceKey] || 0) + 1;
      } catch (err) {
        console.error(`  ERROR converting ${creature.name || 'unknown'}: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\nDone. Converted ${totalCreatures} creatures (${totalErrors} errors).`);
  console.log('\nPer-source breakdown:');
  for (const [key, count] of Object.entries(sourceStats).sort()) {
    console.log(`  ${key}: ${count}`);
  }
}

main();
