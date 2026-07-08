/** Shared seeding utilities: CLI args, stale reconciliation, batching, report. */

const PF2E_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

/**
 * Parse a PF2e creature's plain-text traits line into { size, type } (finding f20).
 * The line is comma-separated with no markup (e.g. "uncommon, n, large, beast").
 * Size is the recognized size word; type is the trait tokens AFTER the size, which
 * drops the leading rarity/alignment tokens and leaves the creature-type traits.
 */
export function parsePf2eTraits(traitsText) {
  const traits = (traitsText || '')
    .replace(/\*/g, '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (!traits.length) return { size: '', type: '' };
  const sizeIdx = traits.findIndex((t) => PF2E_SIZES.includes(t.toLowerCase()));
  const size = sizeIdx >= 0 ? traits[sizeIdx] : '';
  const type = (sizeIdx >= 0 ? traits.slice(sizeIdx + 1) : traits).join(', ');
  return { size, type };
}

export function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    failOnInvalid: argv.includes('--fail-on-invalid'),
    deleteThreshold: 0.10, // abort if a single run would delete >10% of seeded docs
  };
}

/** DB slugs that have no corresponding file on disk. */
export function computeStaleSlugs(onDiskSlugs, dbSlugs) {
  return dbSlugs.filter(s => !onDiskSlugs.has(s));
}

/** True if deleting `staleCount` of `dbCount` exceeds the guard fraction. */
export function exceedsDeleteGuard(staleCount, dbCount, threshold) {
  if (dbCount === 0) return false;
  return staleCount / dbCount > threshold;
}

/** bulkWrite in batches with per-batch error capture. */
export async function writeInBatches(Model, ops, { dryRun, batchSize = 500 } = {}) {
  const report = { upserted: 0, modified: 0, batchErrors: [], wouldWrite: 0 };
  for (let i = 0; i < ops.length; i += batchSize) {
    const batch = ops.slice(i, i + batchSize);
    if (dryRun) { report.wouldWrite += batch.length; continue; }
    try {
      const r = await Model.bulkWrite(batch, { ordered: false });
      report.upserted += r.upsertedCount;
      report.modified += r.modifiedCount;
    } catch (err) {
      report.batchErrors.push({ batchStart: i, message: err.message });
    }
  }
  return report;
}

/**
 * Remove seeded docs whose slug is no longer on disk. Scoped by `scopeFilter`
 * (e.g. { isCustom: false } for monsters) so user content is never deleted.
 * Guarded against a runaway delete and supports dry-run. `onDiskSlugs` MUST be
 * built from filenames (not validated records) so a parse failure never deletes.
 */
export async function reconcileStale(Model, { onDiskSlugs, scopeFilter, dryRun, deleteThreshold, log }) {
  const dbDocs = await Model.find(scopeFilter, { slug: 1 }).lean();
  const dbSlugs = dbDocs.map(d => d.slug);
  const stale = computeStaleSlugs(onDiskSlugs, dbSlugs);
  if (exceedsDeleteGuard(stale.length, dbSlugs.length, deleteThreshold)) {
    log(`ABORT: would delete ${stale.length}/${dbSlugs.length} docs (> ${deleteThreshold * 100}%). Sample: ${stale.slice(0, 10).join(', ')}`);
    return { deleted: 0, stale: stale.length, aborted: true };
  }
  if (dryRun) {
    log(`DRY RUN: would delete ${stale.length} stale docs: ${stale.join(', ')}`);
    return { deleted: 0, stale: stale.length, aborted: false };
  }
  if (stale.length === 0) return { deleted: 0, stale: 0, aborted: false };
  const res = await Model.deleteMany({ ...scopeFilter, slug: { $in: stale } });
  return { deleted: res.deletedCount, stale: stale.length, aborted: false };
}
