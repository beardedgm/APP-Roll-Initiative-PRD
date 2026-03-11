# Unified Cloud Save Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace three separate localStorage silos with a single UserData MongoDB document per user, auto-synced via Zustand store subscription. Remove free tier entirely.

**Architecture:** Single `UserData` document per user stores characters, custom monsters, and encounter presets. A new `useUserDataStore` Zustand store manages this data client-side with `persist` middleware for localStorage caching. A Zustand `subscribe()` listener debounces changes and PUTs the full document to `PUT /api/user-data` with optimistic concurrency (version number). Server wins on conflict (409).

**Tech Stack:** MongoDB/Mongoose, Express 5, Zod, Zustand, React Query, Axios

---

### Task 1: Create UserData MongoDB Model

**Files:**
- Create: `server/models/UserData.js`

**Step 1: Create the model file**

```js
import mongoose from 'mongoose';

const CharacterSchema = new mongoose.Schema({
  id:                 { type: String, required: true },
  name:               { type: String, required: true },
  type:               { type: String, enum: ['player', 'npc'], default: 'player' },
  maxHP:              { type: Number, default: null },
  ac:                 { type: Number, default: 10 },
  initMod:            { type: Number, default: 0 },
  createdAt:          { type: Date, default: Date.now },
  updatedAt:          { type: Date, default: Date.now },
}, { _id: false });

const CustomMonsterSchema = new mongoose.Schema({
  slug:                 { type: String, required: true },
  name:                 { type: String, required: true },
  size:                 { type: String },
  type:                 { type: String },
  alignment:            { type: String },
  ac:                   { type: Number },
  acDesc:               { type: String },
  hp:                   { type: Number },
  hpFormula:            { type: String },
  speed:                { type: String },
  abilities:            { type: mongoose.Schema.Types.Mixed },
  savingThrows:         { type: String },
  skills:               { type: String },
  damageResistances:    { type: String },
  damageImmunities:     { type: String },
  damageVulnerabilities:{ type: String },
  conditionImmunities:  { type: String },
  senses:               { type: String },
  languages:            { type: String },
  cr:                   { type: String },
  initMod:              { type: Number },
  traits:               [{ name: String, description: String, _id: false }],
  actions:              [{ name: String, description: String, _id: false }],
  reactions:            [{ name: String, description: String, _id: false }],
  legendaryActions:     [{ name: String, description: String, _id: false }],
  rawMarkdown:          { type: String },
  createdAt:            { type: Date, default: Date.now },
  updatedAt:            { type: Date, default: Date.now },
}, { _id: false });

const EncounterPresetSchema = new mongoose.Schema({
  id:                { type: String, required: true },
  name:              { type: String, required: true },
  combatants:        [{ type: mongoose.Schema.Types.Mixed }],
  state:             { type: String, enum: ['pre-combat', 'combat'], default: 'pre-combat' },
  currentRound:      { type: Number, default: 1 },
  activeCreatureId:  { type: String, default: null },
  diceHistory:       [{ type: mongoose.Schema.Types.Mixed }],
  createdAt:         { type: Date, default: Date.now },
  updatedAt:         { type: Date, default: Date.now },
}, { _id: false });

const UserDataSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  version:           { type: Number, default: 1 },
  characters:        [CharacterSchema],
  customMonsters:    [CustomMonsterSchema],
  encounterPresets:  [EncounterPresetSchema],
}, { timestamps: true });

const UserData = mongoose.model('UserData', UserDataSchema);
export default UserData;
```

**Step 2: Commit**

```bash
git add server/models/UserData.js
git commit -m "feat: add UserData MongoDB model for unified cloud save"
```

---

### Task 2: Create Zod Validator for UserData

**Files:**
- Create: `server/validators/userData.js`

**Step 1: Create the validator**

```js
import { z } from 'zod';

const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(['player', 'npc']).default('player'),
  maxHP: z.number().int().min(1).max(99999).nullable().default(null),
  ac: z.number().int().min(0).max(99).default(10),
  initMod: z.number().int().min(-10).max(20).default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const entrySchema = z.object({
  name: z.string().max(500),
  description: z.string().max(10000),
});

const customMonsterSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  size: z.string().max(50).optional(),
  type: z.string().max(100).optional(),
  alignment: z.string().max(100).optional(),
  ac: z.number().int().min(0).max(30).optional(),
  acDesc: z.string().max(200).optional(),
  hp: z.number().int().min(1).max(99999).optional(),
  hpFormula: z.string().max(50).optional(),
  speed: z.string().max(200).optional(),
  abilities: z.object({
    str: z.number().int().min(1).max(30).optional(),
    dex: z.number().int().min(1).max(30).optional(),
    con: z.number().int().min(1).max(30).optional(),
    int: z.number().int().min(1).max(30).optional(),
    wis: z.number().int().min(1).max(30).optional(),
    cha: z.number().int().min(1).max(30).optional(),
  }).optional(),
  savingThrows: z.string().max(500).optional(),
  skills: z.string().max(500).optional(),
  damageResistances: z.string().max(500).optional(),
  damageImmunities: z.string().max(500).optional(),
  damageVulnerabilities: z.string().max(500).optional(),
  conditionImmunities: z.string().max(500).optional(),
  senses: z.string().max(500).optional(),
  languages: z.string().max(500).optional(),
  cr: z.string().max(10).optional(),
  initMod: z.number().int().min(-10).max(20).optional(),
  traits: z.array(entrySchema).max(50).optional().default([]),
  actions: z.array(entrySchema).max(50).optional().default([]),
  reactions: z.array(entrySchema).max(50).optional().default([]),
  legendaryActions: z.array(entrySchema).max(50).optional().default([]),
  rawMarkdown: z.string().max(50000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const encounterPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  combatants: z.array(z.any()).max(100).default([]),
  state: z.enum(['pre-combat', 'combat']).default('pre-combat'),
  currentRound: z.number().int().min(1).default(1),
  activeCreatureId: z.string().nullable().default(null),
  diceHistory: z.array(z.any()).max(50).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const updateUserDataSchema = z.object({
  version: z.number().int().min(0),
  characters: z.array(characterSchema).max(500).default([]),
  customMonsters: z.array(customMonsterSchema).max(500).default([]),
  encounterPresets: z.array(encounterPresetSchema).max(500).default([]),
});
```

**Step 2: Commit**

```bash
git add server/validators/userData.js
git commit -m "feat: add Zod validator for UserData PUT endpoint"
```

---

### Task 3: Create UserData API Route

**Files:**
- Create: `server/routes/userData.js`
- Modify: `server/app.js:28,126` (add import + mount)

**Step 1: Create the route file**

```js
import { Router } from 'express';
import UserData from '../models/UserData.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import validate from '../middleware/validate.js';
import { updateUserDataSchema } from '../validators/userData.js';
import logger from '../config/logger.js';

const router = Router();

router.use('/api/user-data', requireAuth, requireSubscription);

// ── Get user data (or create empty doc) ────────────────────
router.get('/api/user-data', async (req, res) => {
  try {
    let doc = await UserData.findOne({ userId: req.session.userId }).lean();
    if (!doc) {
      doc = await UserData.create({ userId: req.session.userId });
      doc = doc.toObject();
    }
    res.json({
      version: doc.version,
      characters: doc.characters,
      customMonsters: doc.customMonsters,
      encounterPresets: doc.encounterPresets,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get user data');
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// ── Update user data (optimistic concurrency) ──────────────
router.put('/api/user-data', validate(updateUserDataSchema), async (req, res) => {
  try {
    const { version, characters, customMonsters, encounterPresets } = req.validated;

    const doc = await UserData.findOneAndUpdate(
      { userId: req.session.userId, version },
      {
        $set: { characters, customMonsters, encounterPresets },
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (!doc) {
      // Version mismatch — return server's current data
      const current = await UserData.findOne({ userId: req.session.userId }).lean();
      if (!current) {
        return res.status(404).json({ error: 'User data not found' });
      }
      return res.status(409).json({
        error: 'Version conflict',
        version: current.version,
        characters: current.characters,
        customMonsters: current.customMonsters,
        encounterPresets: current.encounterPresets,
      });
    }

    res.json({
      version: doc.version,
      characters: doc.characters,
      customMonsters: doc.customMonsters,
      encounterPresets: doc.encounterPresets,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to update user data');
    res.status(500).json({ error: 'Failed to update user data' });
  }
});

export default router;
```

**Step 2: Add import and mount in `server/app.js`**

After line 28 (`import encountersRouter, ...`), add:
```js
import userDataRouter from './routes/userData.js';
```

After line 126 (`app.use(encountersRouter);`), add:
```js
app.use(userDataRouter);
```

**Step 3: Commit**

```bash
git add server/models/UserData.js server/validators/userData.js server/routes/userData.js server/app.js
git commit -m "feat: add GET/PUT /api/user-data endpoints with optimistic concurrency"
```

---

### Task 4: Create useUserData API Hook

**Files:**
- Create: `client/src/api/useUserData.js`

**Step 1: Create the hook file**

```js
import { useQuery } from '@tanstack/react-query';
import axios from './axiosInstance';

export function useUserData(enabled = true) {
  return useQuery({
    queryKey: ['user-data'],
    queryFn: () => axios.get('/user-data').then(r => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
```

**Step 2: Commit**

```bash
git add client/src/api/useUserData.js
git commit -m "feat: add useUserData React Query hook"
```

---

### Task 5: Create useUserDataStore Zustand Store

**Files:**
- Create: `client/src/store/useUserDataStore.js`

**Step 1: Create the store**

```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '../api/axiosInstance';

const useUserDataStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────
      characters: [],
      customMonsters: [],
      encounterPresets: [],
      version: 0,
      syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
      _loaded: false,

      // ── Load from server ───────────────────────────
      loadFromServer: (data) => {
        set({
          characters: data.characters || [],
          customMonsters: data.customMonsters || [],
          encounterPresets: data.encounterPresets || [],
          version: data.version || 0,
          _loaded: true,
          syncStatus: 'idle',
        });
      },

      // ── Characters ─────────────────────────────────
      addCharacter: (char) => {
        const now = new Date().toISOString();
        const id = char.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        set(s => ({
          characters: [...s.characters, { ...char, id, createdAt: now, updatedAt: now }],
        }));
      },

      updateCharacter: (id, updates) => {
        set(s => ({
          characters: s.characters.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      removeCharacter: (id) => {
        set(s => ({
          characters: s.characters.filter(c => c.id !== id),
        }));
      },

      // ── Custom Monsters ────────────────────────────
      addCustomMonster: (monster) => {
        const now = new Date().toISOString();
        const slug = monster.slug || `custom-${monster.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
        set(s => ({
          customMonsters: [...s.customMonsters, {
            ...monster,
            slug,
            isCustom: true,
            sourceKey: 'custom',
            source: 'Custom',
            createdAt: now,
            updatedAt: now,
          }],
        }));
      },

      updateCustomMonster: (slug, updates) => {
        set(s => ({
          customMonsters: s.customMonsters.map(m =>
            m.slug === slug ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
          ),
        }));
      },

      removeCustomMonster: (slug) => {
        set(s => ({
          customMonsters: s.customMonsters.filter(m => m.slug !== slug),
        }));
      },

      // ── Encounter Presets ──────────────────────────
      addEncounterPreset: (preset) => {
        const now = new Date().toISOString();
        const id = preset.id || `enc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set(s => ({
          encounterPresets: [...s.encounterPresets, { ...preset, id, createdAt: now, updatedAt: now }],
        }));
      },

      updateEncounterPreset: (id, updates) => {
        set(s => ({
          encounterPresets: s.encounterPresets.map(e =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        }));
      },

      removeEncounterPreset: (id) => {
        set(s => ({
          encounterPresets: s.encounterPresets.filter(e => e.id !== id),
        }));
      },
    }),
    {
      name: 'user_data_cache',
      partialize: (state) => ({
        characters: state.characters,
        customMonsters: state.customMonsters,
        encounterPresets: state.encounterPresets,
        version: state.version,
      }),
    }
  )
);

export default useUserDataStore;
```

**Step 2: Commit**

```bash
git add client/src/store/useUserDataStore.js
git commit -m "feat: add useUserDataStore Zustand store with persist"
```

---

### Task 6: Create useUserDataSync Hook (Auto-Sync)

**Files:**
- Create: `client/src/hooks/useUserDataSync.js`

**Step 1: Create the sync hook**

```js
import { useEffect, useRef, useCallback } from 'react';
import useUserDataStore from '../store/useUserDataStore';
import axios from '../api/axiosInstance';

/**
 * Subscribes to useUserDataStore changes and auto-syncs to PUT /api/user-data
 * with a 2-second debounce. Handles 409 conflicts by accepting server state.
 */
export default function useUserDataSync(enabled) {
  const timerRef = useRef(null);
  const prevSnapshotRef = useRef(null);
  const syncedTimerRef = useRef(null);

  const sync = useCallback(async () => {
    const { characters, customMonsters, encounterPresets, version, _loaded } = useUserDataStore.getState();
    if (!_loaded) return;

    const snapshot = JSON.stringify({ characters, customMonsters, encounterPresets });
    if (snapshot === prevSnapshotRef.current) return;

    const previousSnapshot = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    useUserDataStore.setState({ syncStatus: 'syncing' });

    try {
      const { data } = await axios.put('/user-data', {
        version,
        characters,
        customMonsters,
        encounterPresets,
      });
      useUserDataStore.setState({
        version: data.version,
        syncStatus: 'synced',
      });
      syncedTimerRef.current = setTimeout(() => {
        useUserDataStore.setState({ syncStatus: 'idle' });
      }, 3000);
    } catch (err) {
      if (err.response?.status === 409) {
        // Server wins — replace local state
        const serverData = err.response.data;
        useUserDataStore.getState().loadFromServer(serverData);
        prevSnapshotRef.current = JSON.stringify({
          characters: serverData.characters,
          customMonsters: serverData.customMonsters,
          encounterPresets: serverData.encounterPresets,
        });
        useUserDataStore.setState({ syncStatus: 'synced' });
        syncedTimerRef.current = setTimeout(() => {
          useUserDataStore.setState({ syncStatus: 'idle' });
        }, 3000);
      } else {
        prevSnapshotRef.current = previousSnapshot;
        useUserDataStore.setState({ syncStatus: 'error' });
        console.error('[useUserDataSync] Failed to sync:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const unsub = useUserDataStore.subscribe(() => {
      const { _loaded } = useUserDataStore.getState();
      if (!_loaded) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(sync, 2000);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    };
  }, [enabled, sync]);
}
```

**Step 2: Commit**

```bash
git add client/src/hooks/useUserDataSync.js
git commit -m "feat: add useUserDataSync hook with 2s debounce and conflict resolution"
```

---

### Task 7: Wire Up Data Loading and Sync in Tracker Page

**Files:**
- Modify: `client/src/pages/Tracker.jsx`

**Step 1: Add data loading and sync activation**

At the top of Tracker.jsx, add imports:
```js
import { useCurrentUser } from '../api/useAuth';
import { useUserData } from '../api/useUserData';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataSync from '../hooks/useUserDataSync';
```

Inside the `Tracker` component, before the existing `useEffect`, add:
```js
const { data: user } = useCurrentUser();
const isAuthenticated = !!user;
const { data: serverData } = useUserData(isAuthenticated);
const loadFromServer = useUserDataStore(s => s.loadFromServer);
const dataLoaded = useUserDataStore(s => s._loaded);

// Load server data into store on first fetch
useEffect(() => {
  if (serverData && !dataLoaded) {
    loadFromServer(serverData);
  }
}, [serverData, dataLoaded, loadFromServer]);

// Enable auto-sync when authenticated
useUserDataSync(isAuthenticated);
```

**Step 2: Commit**

```bash
git add client/src/pages/Tracker.jsx
git commit -m "feat: wire up UserData loading and auto-sync in Tracker"
```

---

### Task 8: Refactor CharacterLibrary to Use useUserDataStore

**Files:**
- Modify: `client/src/components/tracker/CharacterLibrary.jsx`

**Step 1: Rewrite to use store instead of localStorage**

Replace the entire file contents. Key changes:
- Remove import of `characterStorage` utils
- Import `useUserDataStore`
- Read `characters` from store: `useUserDataStore(s => s.characters)`
- Save via `addCharacter` / `updateCharacter` store actions
- Delete via `removeCharacter` store action
- Remove `refresh` state hack (store subscription handles re-renders)

```js
import { useState, useCallback } from 'react';
import useCombatStore from '../../store/useCombatStore';
import useUserDataStore from '../../store/useUserDataStore';

const EMPTY_FORM = { name: '', type: 'player', maxHP: '', ac: '10', initMod: '0' };

export default function CharacterLibrary() {
  const addCombatant = useCombatStore(s => s.addCombatant);
  const combatState = useCombatStore(s => s.state);

  const characters = useUserDataStore(s => s.characters);
  const addCharacter = useUserDataStore(s => s.addCharacter);
  const updateCharacter = useUserDataStore(s => s.updateCharacter);
  const removeCharacter = useUserDataStore(s => s.removeCharacter);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const handleSave = useCallback(() => {
    const name = form.name.trim();
    if (!name) { setError('Name is required.'); return; }

    const charData = {
      name,
      type: form.type,
      maxHP: form.maxHP ? parseInt(form.maxHP, 10) || null : null,
      ac: parseInt(form.ac, 10) || 10,
      initMod: parseInt(form.initMod, 10) || 0,
    };

    if (editId) {
      updateCharacter(editId, charData);
    } else {
      addCharacter(charData);
    }

    setForm(EMPTY_FORM);
    setEditId(null);
    setError('');
  }, [form, editId, addCharacter, updateCharacter]);

  function handleEdit(char) {
    setEditId(char.id);
    setForm({
      name: char.name,
      type: char.type,
      maxHP: char.maxHP != null ? String(char.maxHP) : '',
      ac: String(char.ac ?? 10),
      initMod: String(char.initMod ?? 0),
    });
    setError('');
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this character?')) return;
    removeCharacter(id);
    if (editId === id) { setEditId(null); setForm(EMPTY_FORM); }
  }

  function handleAdd(char) {
    const initiative = combatState === 'combat'
      ? parseInt(window.prompt(`Initiative roll for ${char.name}:`, '10'), 10) || 0
      : 0;
    addCombatant({
      name: char.name,
      maxHP: char.maxHP || 1,
      ac: char.ac || 10,
      initMod: char.initMod || 0,
      type: char.type,
      quantity: 1,
      initiative,
    });
  }

  function handleCancel() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  return (
    <div className="character-library">
      <div className="character-library__list">
        {characters.length === 0 ? (
          <p className="character-library__empty">No saved characters yet. Add your party below!</p>
        ) : (
          characters.map(char => (
            <div key={char.id} className="character-library__item">
              <div className="character-library__item-info">
                <span className="character-library__item-name">{char.name}</span>
                <span className="character-library__item-meta">
                  <span className={`character-library__badge character-library__badge--${char.type}`}>
                    {char.type === 'player' ? 'PC' : 'NPC'}
                  </span>
                  {char.maxHP != null && <span>HP {char.maxHP}</span>}
                  <span>AC {char.ac ?? 10}</span>
                </span>
              </div>
              <div className="character-library__item-actions">
                <button className="btn btn--sm" onClick={() => handleEdit(char)} title="Edit">&#9998;</button>
                <button className="btn btn--sm btn--danger" onClick={() => handleDelete(char.id)} title="Delete">&times;</button>
                <button className="monster-db__add-btn" onClick={() => handleAdd(char)} title="Add to encounter">+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="character-library__form">
        <h4 className="character-library__form-title">{editId ? 'Edit Character' : 'New Character'}</h4>
        {error && <div className="character-library__error">{error}</div>}
        <div className="character-library__form-row">
          <input
            type="text"
            className="character-library__input character-library__input--name"
            placeholder="Character name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={40}
          />
          <select
            className="character-library__select"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="player">Player</option>
            <option value="npc">NPC</option>
          </select>
        </div>
        <div className="character-library__form-row">
          <label className="character-library__field">
            <span>HP</span>
            <input type="number" min={1} max={9999} placeholder="—" value={form.maxHP} onChange={e => setForm(f => ({ ...f, maxHP: e.target.value }))} />
          </label>
          <label className="character-library__field">
            <span>AC</span>
            <input type="number" min={1} max={30} value={form.ac} onChange={e => setForm(f => ({ ...f, ac: e.target.value }))} />
          </label>
          <label className="character-library__field">
            <span>Init &plusmn;</span>
            <input type="number" min={-10} max={10} value={form.initMod} onChange={e => setForm(f => ({ ...f, initMod: e.target.value }))} />
          </label>
        </div>
        <div className="character-library__form-actions">
          <button className="btn btn--primary btn--sm" onClick={handleSave}>
            {editId ? 'Update' : '+ Save Character'}
          </button>
          {editId && (
            <button className="btn btn--sm" onClick={handleCancel}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/tracker/CharacterLibrary.jsx
git commit -m "refactor: CharacterLibrary uses useUserDataStore instead of localStorage"
```

---

### Task 9: Refactor EncounterLibrary to Use useUserDataStore

**Files:**
- Modify: `client/src/components/tracker/EncounterLibrary.jsx`

**Step 1: Rewrite to use store**

Key changes:
- Remove imports of `encounterSaves` utils
- Import `useUserDataStore`
- Read `encounterPresets` from store
- Save via `addEncounterPreset` store action
- Delete via `removeEncounterPreset` store action
- Remove export/import JSON buttons (no free tier)
- Remove `refresh` state hack

```js
import { useState, useCallback } from 'react';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import useUserDataStore from '../../store/useUserDataStore';

export default function EncounterLibrary() {
  const { combatants, state, currentRound, activeCreatureId, diceHistory } = useCombatStore(
    useShallow(s => ({
      combatants: s.combatants, state: s.state,
      currentRound: s.currentRound, activeCreatureId: s.activeCreatureId, diceHistory: s.diceHistory,
    }))
  );
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);

  const encounterPresets = useUserDataStore(s => s.encounterPresets);
  const addEncounterPreset = useUserDataStore(s => s.addEncounterPreset);
  const removeEncounterPreset = useUserDataStore(s => s.removeEncounterPreset);

  const [saveName, setSaveName] = useState('');

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    addEncounterPreset({
      name: saveName.trim(),
      combatants,
      state,
      currentRound,
      activeCreatureId,
      diceHistory,
    });
    setSaveName('');
  }, [saveName, combatants, state, currentRound, activeCreatureId, diceHistory, addEncounterPreset]);

  function handleLoad(preset) {
    if (!window.confirm(`Load "${preset.name}"? Unsaved changes will be lost.`)) return;
    loadSnapshot({
      name: preset.name,
      combatants: preset.combatants,
      state: preset.state,
      currentRound: preset.currentRound,
      activeCreatureId: preset.activeCreatureId,
      diceHistory: preset.diceHistory || [],
    });
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this saved encounter?')) return;
    removeEncounterPreset(id);
  }

  return (
    <div className="encounter-library">
      <div className="encounter-library__list">
        {encounterPresets.length === 0 ? (
          <p className="encounter-library__empty">No saved encounters yet.</p>
        ) : (
          encounterPresets.map(preset => (
            <div key={preset.id} className="encounter-library__item">
              <div className="encounter-library__item-info">
                <span className="encounter-library__item-name">{preset.name || 'Unnamed'}</span>
                <span className="encounter-library__item-meta">
                  {preset.combatants?.length || 0} creature{(preset.combatants?.length || 0) !== 1 ? 's' : ''}
                  {preset.createdAt && ` \u2014 ${new Date(preset.createdAt).toLocaleDateString()}`}
                </span>
              </div>
              <div className="encounter-library__item-actions">
                <button className="btn btn--secondary btn--sm" onClick={() => handleLoad(preset)}>Load</button>
                <button className="btn btn--danger btn--sm" onClick={() => handleDelete(preset.id)}>&times;</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="encounter-library__footer">
        <div className="encounter-library__save-row">
          <input
            type="text"
            className="encounter-library__name-input"
            placeholder="Encounter name..."
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            className="btn btn--primary encounter-library__save-btn"
            onClick={handleSave}
            disabled={!saveName.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/tracker/EncounterLibrary.jsx
git commit -m "refactor: EncounterLibrary uses useUserDataStore instead of localStorage"
```

---

### Task 10: Refactor MonsterFormModal to Use useUserDataStore

**Files:**
- Modify: `client/src/components/monsters/MonsterFormModal.jsx`

**Step 1: Replace localStorage calls with store actions**

Key changes:
- Remove `import { saveLocalMonster } from '../../utils/customMonsterStorage'`
- Remove `import { useCurrentUser } from '../../api/useAuth'` (no premium check needed)
- Remove `isPremium` logic — all saves go to cloud via store
- Import `useUserDataStore`
- Use `addCustomMonster` / `updateCustomMonster` from store
- Remove `onLocalSave` prop
- Remove "Save Locally" text / upgrade note
- Remove the `isPremium` branching in `handleSave` — always use store + cloud API for server-side monsters

The monster form should now:
- For NEW monsters: call `useCreateMonster` to create on server, then store receives it via data refresh
- For EDITING: call `useUpdateMonster` to update on server

Actually, looking at the design more carefully — custom monsters should be stored in the UserData document, NOT as separate Monster documents. This simplifies the architecture. So:

- Remove `useCreateMonster` and `useUpdateMonster` calls
- Use `addCustomMonster` / `updateCustomMonster` from `useUserDataStore`
- The store auto-syncs to server via `useUserDataSync`

Replace the `handleSave` callback and imports:

Remove these imports:
```js
import { useCurrentUser } from '../../api/useAuth';
import { useCreateMonster, useUpdateMonster } from '../../api/useMonsters';
import { saveLocalMonster } from '../../utils/customMonsterStorage';
```

Add this import:
```js
import useUserDataStore from '../../store/useUserDataStore';
```

Remove these lines from the component:
```js
const createMonster = useCreateMonster();
const updateMonster = useUpdateMonster();
const { data: user } = useCurrentUser();
const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');
```

Add:
```js
const addCustomMonster = useUserDataStore(s => s.addCustomMonster);
const updateCustomMonster = useUserDataStore(s => s.updateCustomMonster);
```

Replace `handleSave`:
```js
const handleSave = useCallback(async () => {
  if (!form.name.trim()) {
    setError('Name is required.');
    return;
  }
  setSaving(true);
  setError('');
  try {
    const payload = formDataToMonsterAPI(form);
    if (isEdit && editMonster?.slug) {
      updateCustomMonster(editMonster.slug, payload);
    } else {
      addCustomMonster(payload);
    }
    closeModal();
  } catch (err) {
    setError(err.message || 'Save failed');
    setSaving(false);
  }
}, [form, isEdit, editMonster, addCustomMonster, updateCustomMonster, closeModal]);
```

Replace the save button (remove `isPremium` conditional):
```jsx
<button className="btn btn--primary monster-form__submit" onClick={handleSave} disabled={saving}>
  {saving ? 'Saving...' : isEdit ? 'Update Monster' : 'Save Monster'}
</button>
```

Remove the upgrade note:
```jsx
{!isPremium && (
  <p className="monster-form__local-note">Saved to browser storage (max 50). Upgrade for cloud sync.</p>
)}
```

**Step 2: Remove `onLocalSave` prop from all callers**

In `client/src/pages/Tracker.jsx`, find where `MonsterFormModal` is rendered and remove the `onLocalSave` prop.

**Step 3: Commit**

```bash
git add client/src/components/monsters/MonsterFormModal.jsx client/src/pages/Tracker.jsx
git commit -m "refactor: MonsterFormModal saves to useUserDataStore instead of localStorage/API"
```

---

### Task 11: Refactor ImportMonsterModal to Use useUserDataStore

**Files:**
- Modify: `client/src/components/monsters/ImportMonsterModal.jsx`

**Step 1: Replace localStorage/API calls with store**

Remove these imports:
```js
import { useCurrentUser } from '../../api/useAuth';
import { useCreateMonster } from '../../api/useMonsters';
import { saveLocalMonster } from '../../utils/customMonsterStorage';
```

Add:
```js
import useUserDataStore from '../../store/useUserDataStore';
```

Remove from component:
```js
const createMonster = useCreateMonster();
const { data: user } = useCurrentUser();
const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');
```

Add:
```js
const addCustomMonster = useUserDataStore(s => s.addCustomMonster);
```

Replace `handleSave`:
```js
async function handleSave() {
  if (!parsed) return;
  setSaving(true);
  try {
    addCustomMonster(parsed);
    reset();
    closeModal();
  } catch (err) {
    setErrors([err.message || 'Save failed']);
    setSaving(false);
  }
}
```

Replace save button text:
```jsx
{saving ? 'Saving...' : 'Save to Library'}
```

Remove the upgrade note:
```jsx
{!isPremium && (
  <p className="import-monster__local-note">
    Saved to browser storage (max 50). Upgrade for cloud sync.
  </p>
)}
```

Remove the `onLocalSave` prop from the component signature and from callers.

**Step 2: Commit**

```bash
git add client/src/components/monsters/ImportMonsterModal.jsx client/src/pages/Tracker.jsx
git commit -m "refactor: ImportMonsterModal saves to useUserDataStore"
```

---

### Task 12: Refactor MonsterDatabase to Use useUserDataStore

**Files:**
- Modify: `client/src/components/tracker/MonsterDatabase.jsx`

**Step 1: Replace localStorage monster logic with store**

Remove:
```js
import { searchLocalMonsters, getLocalMonster, deleteLocalMonster } from '../../utils/customMonsterStorage';
```

Add:
```js
import useUserDataStore from '../../store/useUserDataStore';
```

Inside the component, replace local monster logic:

Remove:
```js
const [localRefresh, setLocalRefresh] = useState(0);
```

Remove:
```js
const refreshLocal = useCallback(() => setLocalRefresh(n => n + 1), []);
```

Add:
```js
const storeMonsters = useUserDataStore(s => s.customMonsters);
const removeCustomMonster = useUserDataStore(s => s.removeCustomMonster);
```

Replace `refreshLocal` in `useImperativeHandle` — it's no longer needed since store changes auto-trigger re-renders. Either remove it or make it a no-op:
```js
useImperativeHandle(ref, () => ({
  showStatBlock(slug) { setSelectedSlug(slug); },
  refreshLocal() { /* no-op, store auto-updates */ },
}), []);
```

Replace the local monster merge logic (lines ~66-78):
```js
// Filter store custom monsters by search/CR
const localMonsters = storeMonsters.filter(m => {
  if (debouncedQuery) {
    const pattern = new RegExp(debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (!pattern.test(m.name)) return false;
  }
  if (crFilter && m.cr !== crFilter) return false;
  return true;
}).sort((a, b) => a.name.localeCompare(b.name));
```

Replace `handleDeleteMonster`:
```js
const handleDeleteMonster = useCallback(async (slug) => {
  try {
    if (storeMonsters.some(m => m.slug === slug)) {
      removeCustomMonster(slug);
    } else {
      await deleteMonster.mutateAsync(slug);
    }
    setSelectedSlug(null);
  } catch {
    window.alert('Failed to delete monster.');
  }
}, [storeMonsters, removeCustomMonster, deleteMonster]);
```

Replace `isLocalSlug` check to look at store:
```js
const isCustomSlug = storeMonsters.some(m => m.slug === selectedSlug);
const { data: apiMonster, isLoading: loadingApiDetail } = useMonster(isCustomSlug ? null : selectedSlug);
const storeDetailMonster = isCustomSlug ? storeMonsters.find(m => m.slug === selectedSlug) : null;
const selectedMonster = isCustomSlug ? storeDetailMonster : apiMonster;
const loadingDetail = isCustomSlug ? false : loadingApiDetail;
```

Update the `onDelete` and `onEdit` conditions to use `isCustomSlug` instead of `isLocalSlug`.

Remove the `isPremium` check from `onDelete` and `onEdit` — all custom monsters are editable/deletable now.

Remove `_localDep` suppression hack.

**Step 2: Commit**

```bash
git add client/src/components/tracker/MonsterDatabase.jsx
git commit -m "refactor: MonsterDatabase reads custom monsters from useUserDataStore"
```

---

### Task 13: Refactor TrackerHeader (Remove Cloud Sync Button)

**Files:**
- Modify: `client/src/components/tracker/TrackerHeader.jsx`

**Step 1: Remove manual sync button**

The sync button is no longer needed — data syncs automatically.

Remove:
```js
import { useCurrentUser } from '../../api/useAuth';
import { useCreateEncounter } from '../../api/useEncounters';
```

Remove from component:
```js
const { data: user } = useCurrentUser();
const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');
const createEncounter = useCreateEncounter();
```

Remove `handleSync` callback entirely.

Remove the sync button JSX block:
```jsx
{isPremium && (
  <>
    <button className="btn btn--icon" onClick={handleSync} ...>...</button>
    <span className="header-divider" />
  </>
)}
```

Optionally add a sync status indicator. Import and display:
```js
import useUserDataStore from '../../store/useUserDataStore';
```

In component:
```js
const syncStatus = useUserDataStore(s => s.syncStatus);
```

Add after the undo/redo buttons:
```jsx
{syncStatus !== 'idle' && (
  <>
    <span className="header-divider" />
    <span className={`sync-indicator sync-indicator--${syncStatus}`}>
      {syncStatus === 'syncing' ? 'Saving...' : syncStatus === 'synced' ? 'Saved' : syncStatus === 'error' ? 'Sync error' : ''}
    </span>
  </>
)}
```

**Step 2: Commit**

```bash
git add client/src/components/tracker/TrackerHeader.jsx
git commit -m "refactor: replace manual sync button with auto-sync status indicator"
```

---

### Task 14: Refactor Dashboard to Use useUserDataStore

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

**Step 1: Replace encounters API with store data**

The Dashboard currently uses `useEncounters()` to list cloud-saved encounters. These are now `encounterPresets` in `useUserDataStore`.

Replace `useEncounters` / `useCreateEncounter` / `useDeleteEncounter` with store operations. Keep share/unshare for the separate live-sharing feature (which still uses the Encounter model).

Key changes:
- Read `encounterPresets` from `useUserDataStore`
- Save current → `addEncounterPreset`
- Delete → `removeEncounterPreset`
- Load → `loadSnapshot` (same as before)
- Share/Unshare → these need an Encounter document on the server, so they remain as API calls. However, sharing is a separate concern from saving presets. For now, remove share/unshare from Dashboard (it's available in the tracker).

Replace the imports and component body to use `useUserDataStore` for CRUD, keeping the same UI layout.

**Step 2: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "refactor: Dashboard uses useUserDataStore for encounter presets"
```

---

### Task 15: Add Sync Status CSS

**Files:**
- Modify: `client/src/styles/tracker.css`

**Step 1: Add sync indicator styles**

```css
/* ── Sync Status Indicator ─────────────────────────── */
.sync-indicator {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.sync-indicator--syncing {
  color: var(--color-accent-gold);
}
.sync-indicator--synced {
  color: var(--color-accent-green, #4ade80);
}
.sync-indicator--error {
  color: var(--color-accent-red);
}
```

**Step 2: Commit**

```bash
git add client/src/styles/tracker.css
git commit -m "style: add sync status indicator styles"
```

---

### Task 16: Delete Obsolete localStorage Utility Files

**Files:**
- Delete: `client/src/utils/characterStorage.js`
- Delete: `client/src/utils/customMonsterStorage.js`
- Delete: `client/src/utils/encounterSaves.js`

**Step 1: Verify no remaining imports**

Run: `cd client && grep -r "characterStorage\|customMonsterStorage\|encounterSaves" src/ --include="*.js" --include="*.jsx"`

Expected: No results.

**Step 2: Delete the files**

```bash
cd client
rm src/utils/characterStorage.js src/utils/customMonsterStorage.js src/utils/encounterSaves.js
```

**Step 3: Commit**

```bash
git add -A client/src/utils/characterStorage.js client/src/utils/customMonsterStorage.js client/src/utils/encounterSaves.js
git commit -m "chore: delete obsolete localStorage utility files"
```

---

### Task 17: Add One-Time Migration from localStorage

**Files:**
- Create: `client/src/utils/migrateLocalStorage.js`
- Modify: `client/src/pages/Tracker.jsx` (call migration on mount)

**Step 1: Create migration utility**

```js
/**
 * One-time migration: move data from old localStorage keys into useUserDataStore.
 * Runs once per browser. Safe to remove after a few weeks.
 */
import useUserDataStore from '../store/useUserDataStore';

const MIGRATION_KEY = 'user_data_migrated';

export function migrateLocalStorageToStore() {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const store = useUserDataStore.getState();
  let migrated = false;

  // Migrate characters
  try {
    const raw = localStorage.getItem('saved_characters');
    if (raw) {
      const chars = JSON.parse(raw);
      if (Array.isArray(chars) && chars.length > 0) {
        for (const char of chars) {
          if (char.name && !store.characters.some(c => c.id === char.id)) {
            store.addCharacter(char);
          }
        }
        localStorage.removeItem('saved_characters');
        migrated = true;
      }
    }
  } catch { /* ignore */ }

  // Migrate custom monsters
  try {
    const raw = localStorage.getItem('custom_monsters');
    if (raw) {
      const monsters = JSON.parse(raw);
      if (Array.isArray(monsters) && monsters.length > 0) {
        for (const m of monsters) {
          if (m.name && !store.customMonsters.some(cm => cm.slug === m.slug)) {
            store.addCustomMonster(m);
          }
        }
        localStorage.removeItem('custom_monsters');
        migrated = true;
      }
    }
  } catch { /* ignore */ }

  // Migrate encounter saves
  try {
    const raw = localStorage.getItem('dnd_saved_encounters');
    if (raw) {
      const saves = JSON.parse(raw);
      if (Array.isArray(saves) && saves.length > 0) {
        for (const save of saves) {
          const preset = save.snapshot || save;
          if (preset.combatants && !store.encounterPresets.some(e => e.id === save.id)) {
            store.addEncounterPreset({
              id: save.id,
              name: save.name || preset.name || 'Unnamed',
              combatants: preset.combatants,
              state: preset.state || 'pre-combat',
              currentRound: preset.currentRound || 1,
              activeCreatureId: preset.activeCreatureId || null,
              diceHistory: preset.diceHistory || [],
            });
          }
        }
        localStorage.removeItem('dnd_saved_encounters');
        migrated = true;
      }
    }
  } catch { /* ignore */ }

  if (migrated) {
    console.log('[migration] Migrated localStorage data to UserData store');
  }

  localStorage.setItem(MIGRATION_KEY, '1');
}
```

**Step 2: Call migration in Tracker.jsx**

Add import:
```js
import { migrateLocalStorageToStore } from '../utils/migrateLocalStorage';
```

Add after the `loadFromServer` effect:
```js
useEffect(() => {
  if (dataLoaded) {
    migrateLocalStorageToStore();
  }
}, [dataLoaded]);
```

**Step 3: Commit**

```bash
git add client/src/utils/migrateLocalStorage.js client/src/pages/Tracker.jsx
git commit -m "feat: add one-time migration from localStorage to UserData store"
```

---

### Task 18: Clean Up LeftPanel (Remove refreshLocal)

**Files:**
- Modify: `client/src/components/tracker/LeftPanel.jsx`

**Step 1: Remove `refreshLocal` from imperative handle**

Since store changes auto-trigger re-renders, `refreshLocal` is no longer needed. Simplify:

```js
useImperativeHandle(ref, () => ({
  showStatBlock(slug) {
    setActiveTab('monsters');
    monsterDbRef.current?.showStatBlock(slug);
  },
}), []);
```

Remove `refreshLocal` from `Tracker.jsx` callers if any.

**Step 2: Commit**

```bash
git add client/src/components/tracker/LeftPanel.jsx client/src/pages/Tracker.jsx
git commit -m "chore: remove refreshLocal from LeftPanel (store auto-updates)"
```

---

### Task 19: Clean Up Unused Server Monster Routes

**Files:**
- Modify: `server/routes/monsters.js`

**Step 1: Remove custom monster CRUD endpoints**

Custom monsters are now stored in UserData, not as separate Monster documents. Remove:
- `POST /api/monsters` (create custom)
- `PUT /api/monsters/:slug` (update custom)
- `DELETE /api/monsters/:slug` (delete custom)

Keep:
- `GET /api/monsters/search` (search seeded monsters — remove custom monster merge logic)
- `GET /api/monsters/sources` (keep but remove custom source)
- `GET /api/monsters/:slug` (keep for seeded monster detail)

In the search endpoint, remove the dual-query logic that merges custom monsters for authenticated users. Only return seeded monsters.

**Step 2: Commit**

```bash
git add server/routes/monsters.js
git commit -m "refactor: remove custom monster CRUD from server (now in UserData)"
```

---

### Task 20: Clean Up Unused Client Monster API Hooks

**Files:**
- Modify: `client/src/api/useMonsters.js`

**Step 1: Remove unused mutation hooks**

Remove:
- `useCreateMonster`
- `useUpdateMonster`
- `useDeleteMonster`

These are no longer called anywhere since custom monsters are managed via `useUserDataStore`.

Keep:
- `useMonsterSearch`
- `useMonsterBrowse`
- `useMonster`
- `useMonsterSources`

**Step 2: Verify no remaining imports**

Run: `cd client && grep -r "useCreateMonster\|useUpdateMonster\|useDeleteMonster" src/ --include="*.js" --include="*.jsx"`

Expected: Only the definitions in `useMonsters.js` (which we're removing).

**Step 3: Commit**

```bash
git add client/src/api/useMonsters.js
git commit -m "chore: remove unused monster mutation hooks"
```

---

### Task 21: Build Verification

**Step 1: Run client build**

```bash
cd client && npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Run lint**

```bash
cd client && npm run lint
```

Expected: No errors (warnings acceptable).

**Step 3: Fix any issues found, then commit**

```bash
git add -A
git commit -m "fix: resolve build/lint issues from unified cloud save refactor"
```

---

### Task 22: Final Commit and PR

**Step 1: Verify all changes**

```bash
git status
git log --oneline origin/main..HEAD
```

**Step 2: Push and create PR**

```bash
git push origin HEAD
gh pr create --title "feat: unified cloud save system" --body "$(cat <<'EOF'
## Summary
- Add UserData MongoDB model storing characters, custom monsters, and encounter presets per user
- Add GET/PUT /api/user-data endpoints with optimistic concurrency (version-based)
- Add useUserDataStore Zustand store with localStorage cache and auto-sync (2s debounce)
- Refactor CharacterLibrary, EncounterLibrary, MonsterFormModal, ImportMonsterModal, MonsterDatabase, TrackerHeader, Dashboard to use new store
- Remove free-tier localStorage-only code paths, export/import buttons, upgrade messaging
- Delete obsolete localStorage utility files (characterStorage, customMonsterStorage, encounterSaves)
- Add one-time migration from old localStorage keys to new store
- Remove custom monster CRUD from server routes (now in UserData)

## Test plan
- [ ] Create a character in the library — verify it appears and auto-syncs
- [ ] Create a custom monster — verify it appears in monster database
- [ ] Save an encounter preset — verify it appears in encounter library
- [ ] Reload the page — verify all data persists
- [ ] Open in a second browser — verify data synced from server
- [ ] Check sync status indicator shows "Saving..." then "Saved"
- [ ] Delete items from each list — verify deletion syncs
- [ ] Verify seeded monster search still works
- [ ] Verify live encounter sharing still works (separate system)
- [ ] Run `cd client && npm run build` — no errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Implementation Order

Tasks 1-3 (server) → Tasks 4-6 (client infra) → Task 7 (wiring) → Tasks 8-14 (component refactors) → Task 15 (CSS) → Tasks 16-18 (cleanup) → Tasks 19-20 (server cleanup) → Tasks 21-22 (verification + PR)

Each task is independently committable. Build verification after Task 21 catches any issues before the final PR.
