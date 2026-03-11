/**
 * localStorage-based storage for custom monsters (free-tier users).
 * Max 50 monsters. Premium users use the cloud API instead.
 */

const STORAGE_KEY = 'custom_monsters';
const MAX_MONSTERS = 50;

/** Get all local custom monsters. */
export function getLocalMonsters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save (add or update) a monster to localStorage. Returns the saved monster. */
export function saveLocalMonster(monster) {
  const monsters = getLocalMonsters();

  // Generate a slug if not present
  if (!monster.slug) {
    const base = monster.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    monster.slug = `local-${base}-${rand}`;
  }

  monster.isCustom = true;
  monster.isLocal = true;
  monster.sourceKey = 'custom';
  monster.source = 'Custom (Local)';

  const idx = monsters.findIndex(m => m.slug === monster.slug);
  if (idx >= 0) {
    monsters[idx] = { ...monsters[idx], ...monster };
  } else {
    if (monsters.length >= MAX_MONSTERS) {
      throw new Error(`Maximum of ${MAX_MONSTERS} local custom monsters reached. Delete some or upgrade to premium for unlimited cloud storage.`);
    }
    monsters.push(monster);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(monsters));
  return monster;
}

/** Delete a local monster by slug. */
export function deleteLocalMonster(slug) {
  const monsters = getLocalMonsters().filter(m => m.slug !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(monsters));
}

/** Get a single local monster by slug. */
export function getLocalMonster(slug) {
  return getLocalMonsters().find(m => m.slug === slug) || null;
}

/** Export all local monsters as a JSON download. */
export function exportLocalMonsters() {
  const monsters = getLocalMonsters();
  const blob = new Blob([JSON.stringify(monsters, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `custom-monsters-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import monsters from a JSON array, merging by slug. Returns count imported. */
export function importLocalMonsters(jsonText) {
  let incoming;
  try {
    incoming = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON');
  }
  if (!Array.isArray(incoming)) {
    throw new Error('Expected a JSON array of monsters');
  }

  let count = 0;
  for (const monster of incoming) {
    if (!monster.name) continue;
    try {
      saveLocalMonster(monster);
      count++;
    } catch {
      break; // hit the limit
    }
  }
  return count;
}

/** Search local monsters by query, source, and cr filters. */
export function searchLocalMonsters({ q, cr } = {}) {
  let monsters = getLocalMonsters();

  if (q && q.trim()) {
    const pattern = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    monsters = monsters.filter(m => pattern.test(m.name));
  }

  if (cr !== undefined && cr !== '') {
    monsters = monsters.filter(m => m.cr === cr);
  }

  return monsters.sort((a, b) => a.name.localeCompare(b.name));
}
