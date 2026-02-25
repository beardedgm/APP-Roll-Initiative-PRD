/* ============================================================
   state.js — Shared localStorage utilities
   Must be loaded before dm.js or player.js
   ============================================================ */

const STATE_KEY  = 'dnd_initiative_state';
const SAVES_KEY  = 'dnd_saved_encounters';

const DEFAULT_STATE = {
  id:              null,
  name:            'New Encounter',
  state:           'pre-combat',
  currentRound:    1,
  activeCreatureId: null,
  combatants:      [],
  diceHistory:     []
};

/* In-memory fallback if localStorage is unavailable */
let _memoryState = null;
let _localStorageAvailable = true;

(function checkLocalStorage() {
  try {
    localStorage.setItem('__ls_test__', '1');
    localStorage.removeItem('__ls_test__');
  } catch (e) {
    _localStorageAvailable = false;
    _memoryState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    _memoryState.id = generateEncounterId();
    console.warn('[state.js] localStorage unavailable, using in-memory state.');
  }
})();

/* ── ID Generators ──────────────────────────────────────────── */
function generateId() {
  return `combatant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateEncounterId() {
  return `enc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ── Default State ──────────────────────────────────────────── */
function getDefaultState() {
  const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
  base.id = generateEncounterId();
  return base;
}

/* ── Schema Migration ───────────────────────────────────────── */
/**
 * Migrates an old-format state object (pre-PRD schema) to the new schema.
 * Mutates the object in-place and returns it.
 * Safe to call on already-migrated objects (no-op if `state` field exists).
 */
function migrateState(parsed) {
  if (typeof parsed.state !== 'undefined') return parsed; // already new schema

  /* Wrap into new schema */
  parsed.state         = 'pre-combat';
  parsed.id            = parsed.id || generateEncounterId();
  parsed.name          = parsed.name || 'Recovered Encounter';
  parsed.currentRound  = parsed.round || 1;
  parsed.activeCreatureId = null;

  /* Convert index-based active to ID-based */
  if (typeof parsed.currentTurnIndex === 'number' && Array.isArray(parsed.combatants)) {
    const active = parsed.combatants[parsed.currentTurnIndex];
    parsed.activeCreatureId = active ? active.id : null;
    /* If there was an active creature it means combat was running */
    if (parsed.activeCreatureId) parsed.state = 'combat';
  }

  /* Backfill missing fields on each combatant */
  if (Array.isArray(parsed.combatants)) {
    parsed.combatants.forEach(c => {
      if (c.ac               === undefined) c.ac               = 10;
      if (c.initiativeModifier === undefined) c.initiativeModifier = 0;
      if (c.status           === undefined) c.status           = 'normal';
    });
  }

  /* Remove obsolete fields */
  delete parsed.round;
  delete parsed.currentTurnIndex;

  return parsed;
}

/* ── loadState ──────────────────────────────────────────────── */
function loadState() {
  try {
    let raw;
    if (!_localStorageAvailable) {
      raw = _memoryState ? JSON.stringify(_memoryState) : null;
    } else {
      raw = localStorage.getItem(STATE_KEY);
    }
    if (!raw) return getDefaultState();

    let parsed = JSON.parse(raw);

    /* Migrate old schema if necessary */
    parsed = migrateState(parsed);

    /* Validate / repair shape */
    if (!Array.isArray(parsed.combatants))    parsed.combatants      = [];
    if (!Array.isArray(parsed.diceHistory))   parsed.diceHistory     = [];
    if (typeof parsed.currentRound !== 'number' || parsed.currentRound < 1) parsed.currentRound = 1;
    if (parsed.state !== 'combat' && parsed.state !== 'pre-combat')          parsed.state        = 'pre-combat';
    if (!parsed.id)   parsed.id   = generateEncounterId();
    if (!parsed.name) parsed.name = 'New Encounter';

    /* Validate activeCreatureId still exists */
    if (parsed.activeCreatureId !== null) {
      const exists = parsed.combatants.some(c => c.id === parsed.activeCreatureId);
      if (!exists) parsed.activeCreatureId = null;
    }

    return parsed;
  } catch (e) {
    console.warn('[state.js] loadState error, returning default:', e);
    return getDefaultState();
  }
}

/* ── saveState ──────────────────────────────────────────────── */
function saveState(state) {
  try {
    const json = JSON.stringify(state);
    if (!_localStorageAvailable) {
      _memoryState = JSON.parse(json);
    } else {
      localStorage.setItem(STATE_KEY, json);
    }
  } catch (e) {
    console.error('[state.js] saveState error:', e);
  }
}

/* ── clearState ─────────────────────────────────────────────── */
function clearState() {
  saveState(getDefaultState());
}

/* ── getRawState ─────────────────────────────────────────────── */
function getRawState() {
  if (!_localStorageAvailable) {
    return _memoryState ? JSON.stringify(_memoryState) : null;
  }
  try {
    return localStorage.getItem(STATE_KEY);
  } catch (e) {
    return null;
  }
}

/* ── isLocalStorageAvailable ─────────────────────────────────── */
function isLocalStorageAvailable() {
  return _localStorageAvailable;
}

/* ── Named Saves ─────────────────────────────────────────────── */
function loadNamedEncounters() {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveNamedEncounter(save) {
  /* save = { id, name, savedAt, snapshot } */
  try {
    const all = loadNamedEncounters();
    const idx = all.findIndex(s => s.id === save.id);
    if (idx >= 0) {
      all[idx] = save;
    } else {
      all.push(save);
    }
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('[state.js] saveNamedEncounter error:', e);
    alert('Could not save: localStorage quota may be full.');
  }
}

function deleteNamedEncounter(id) {
  try {
    const all = loadNamedEncounters().filter(s => s.id !== id);
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('[state.js] deleteNamedEncounter error:', e);
  }
}

/* ── Export / Import ─────────────────────────────────────────── */
function exportEncounterJSON(state) {
  const filename = `${(state.name || 'encounter').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a File object, validates it, migrates if needed, and resolves with the state.
 * @param {File} file
 * @returns {Promise<object>}
 */
function importEncounterJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided.'));
    /* Accept .json or application/json; also allow empty type (some browsers) */
    if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return reject(new Error('File must be a .json file.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let parsed = JSON.parse(e.target.result);

        /* Basic shape check */
        if (!Array.isArray(parsed.combatants)) {
          return reject(new Error('Invalid file: missing combatants array.'));
        }

        /* Migrate old-format exports */
        parsed = migrateState(parsed);

        resolve(parsed);
      } catch (err) {
        reject(new Error('File is not valid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
