# Unified Cloud Save System

## Overview

Replace the current fragmented storage approach (three separate localStorage silos + one cloud-only encounters API) with a single unified cloud save system. All user-created data syncs automatically to the server for authenticated users.

**Key decision**: Free tier is removed entirely. Only paid subscribers and admin can use the app. This eliminates all localStorage-only paths, export/import flows, and upgrade messaging.

## Data Model

### UserData MongoDB Document (one per user)

```js
{
  userId: ObjectId,          // ref → User
  version: Number,           // optimistic concurrency
  characters: [{             // saved character templates
    id: String,              // char_{timestamp}_{random}
    name: String,
    type: 'player' | 'npc',
    hp: Number,
    maxHp: Number,
    ac: Number,
    initiative: Number,
    initiativeModifier: Number,
    stats: Object,
    conditions: [String],
    notes: String,
    createdAt: Date,
    updatedAt: Date,
  }],
  customMonsters: [{         // user-created monsters
    slug: String,            // custom-{name}-{random}
    name: String,
    size: String,
    type: String,
    alignment: String,
    ac: Number,
    acType: String,
    hp: Number,
    hpFormula: String,
    speed: Object,
    stats: Object,           // STR/DEX/CON/INT/WIS/CHA
    savingThrows: [Object],
    skills: [Object],
    damageResistances: String,
    damageImmunities: String,
    conditionImmunities: String,
    senses: String,
    languages: String,
    cr: String,
    traits: [{ name, description }],
    actions: [{ name, description }],
    legendaryActions: [{ name, description }],
    reactions: [{ name, description }],
    createdAt: Date,
    updatedAt: Date,
  }],
  encounterPresets: [{       // saved encounter snapshots
    id: String,              // enc_{timestamp}_{random}
    name: String,
    combatants: [Object],
    state: String,
    currentRound: Number,
    activeCreatureId: String,
    diceHistory: [Object],
    createdAt: Date,
    updatedAt: Date,
  }],
  updatedAt: Date,
}
```

**Size**: ~16MB MongoDB document limit. At ~2KB per entry, supports ~2,500 items per array — more than enough.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/user-data` | Fetch full UserData document |
| `PUT` | `/api/user-data` | Update full UserData document (version check) |

Both require `requireAuth` + `requireSubscription` middleware.

### PUT Version Check

Client sends `{ version, characters, customMonsters, encounterPresets }`. Server compares `version` against stored version:
- Match → save, increment version, return new version
- Mismatch → return `409 Conflict` with server's current data
- Client receives 409 → replace local state with server data (server wins)

## Client Architecture

### useUserDataStore (Zustand + persist)

Single store replacing `characterStorage.js`, `customMonsterStorage.js`, and `encounterSaves.js`.

```
useUserDataStore
├── characters: []
├── customMonsters: []
├── encounterPresets: []
├── version: 0
├── syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
├── addCharacter(char)
├── updateCharacter(id, updates)
├── removeCharacter(id)
├── addCustomMonster(monster)
├── updateCustomMonster(slug, updates)
├── removeCustomMonster(slug)
├── addEncounterPreset(preset)
├── updateEncounterPreset(id, updates)
├── removeEncounterPreset(id)
├── loadFromServer()
└── _syncToServer()     // internal, debounced 2s
```

### Auto-Sync Flow

1. Zustand `subscribe()` detects any mutation
2. 2-second debounce timer starts/resets
3. Timer fires → `PUT /api/user-data` with full document + version
4. Success → update version, set status `synced`
5. 409 Conflict → replace local state with server response (server wins)
6. Error → set status `error`, retry on next mutation

### Data Loading

On app mount (authenticated user):
1. `GET /api/user-data` → populate store
2. If no document exists, server creates empty one
3. Zustand `persist` provides localStorage cache for instant render while server fetch completes

## Code to Remove

### Files to Delete
- `client/src/utils/customMonsterStorage.js`
- `client/src/utils/characterStorage.js`
- `client/src/utils/encounterSaves.js`

### Code Paths to Remove
- All "Save Locally" buttons and localStorage fallback logic
- Free-tier upgrade messaging / upsell banners
- 50-item localStorage limits
- Local monster merge logic in MonsterDatabase
- Export/import JSON functionality
- `requireSubscription` guard can remain (now applies to all authenticated users)

### Server Routes to Consolidate
- `DELETE /api/encounters/:id` → handled by store mutation + sync
- `POST /api/encounters` → handled by store mutation + sync
- `PUT /api/encounters/:id` → handled by store mutation + sync
- Keep `/api/encounters/:id/share` and `/api/shared/:code` (live sharing is separate from saves)

## Migration

On first load after deploy:
1. Check localStorage for existing data in old keys (`saved_characters`, `custom_monsters`, `named_encounters`)
2. If found and user is authenticated, merge into UserData document via PUT
3. Clear old localStorage keys after successful migration
4. One-time operation; migration code can be removed after a few weeks

## Live Encounter Sync (Unchanged)

The existing `useCloudSync` hook for live encounter sharing (real-time player view) remains separate. It syncs the active combat state to the Encounter document for the share code feature. This is distinct from the UserData save system.
