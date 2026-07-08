/**
 * listStatlessPf2e.js — read-only report of PF2e creatures the monster seed
 * skips because their markdown has a non-numeric AC or HP (e.g. `**AC** —`,
 * `**AC** null`). These come from a faulty upstream conversion, not a parser
 * bug: seedMonsters correctly refuses to invent stats, so seedMonsterSchema
 * drops them and they never reach the catalog.
 *
 * This script touches NO database — it is a pure filesystem scan that mirrors
 * the seed's own name/AC/HP extraction, so its output is exactly the set the
 * seeder excludes. Re-run it after any re-convert to confirm the excluded set
 * did not grow.
 *
 *   node server/scripts/listStatlessPf2e.js
 *   node server/scripts/listStatlessPf2e.js --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PF2E_SOURCE_LABELS from '../config/pf2eSourceLabels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONSTERS_PF2E_DIR = path.join(__dirname, '..', '..', 'monsters', 'pf2e');

// Exact-match the seed's extraction (seedMonsters.js parsePf2e / slugFromFilename).
const NAME_RE = /^#\s+(.+)$/m;
const AC_RE = /\*\*AC\*\*\s*(\d+)/i;
const HP_RE = /\*\*HP\*\*\s*(\d+)/i;

function slugFromFilename(filename) {
  return filename.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function scan() {
  if (!fs.existsSync(MONSTERS_PF2E_DIR)) {
    console.error(`monsters/pf2e/ not found at ${MONSTERS_PF2E_DIR}`);
    process.exit(1);
  }

  const folders = fs.readdirSync(MONSTERS_PF2E_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  const statless = [];

  for (const folder of folders) {
    const folderPath = path.join(MONSTERS_PF2E_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.md')).sort();

    for (const file of files) {
      const md = fs.readFileSync(path.join(folderPath, file), 'utf8');
      const acOk = AC_RE.test(md);
      const hpOk = HP_RE.test(md);
      if (acOk && hpOk) continue; // valid — the seed keeps it

      const name = (md.match(NAME_RE)?.[1] || 'Unknown').trim();
      statless.push({
        slug: `pf2e_${folder}--${slugFromFilename(file)}`,
        name,
        source: PF2E_SOURCE_LABELS[folder] || `PF2e ${folder.toUpperCase()}`,
        folder,
        hasAc: acOk,
        hasHp: hpOk,
        path: `monsters/pf2e/${folder}/${file}`,
      });
    }
  }

  return statless;
}

const statless = scan();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(statless, null, 2));
} else {
  let currentSource = null;
  for (const c of statless) {
    if (c.source !== currentSource) {
      currentSource = c.source;
      console.log(`\n${c.source} (${c.folder})`);
    }
    // Flag the ones that DO have HP (only AC is missing) — the likeliest real
    // combatants worth a hand-fix if a source AC can be supplied.
    const flag = c.hasHp && !c.hasAc ? '  [has HP, AC missing]' : '';
    console.log(`  ${c.name}  —  ${c.slug}${flag}`);
  }
  const hpOnly = statless.filter(c => c.hasHp && !c.hasAc);
  console.log(`\n${statless.length} statless PF2e creatures skipped by the seed.`);
  console.log(`${hpOnly.length} have HP but a missing AC: ${hpOnly.map(c => c.name).join(', ') || '(none)'}`);
}
