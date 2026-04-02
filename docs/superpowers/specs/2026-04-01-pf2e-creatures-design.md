# Pathfinder 2e Creature Support — Design Spec

**Date:** 2026-04-01
**Stage:** New Feature
**Scope:** Add full PF2e creature browsing, custom creation, and import to the combat tracker alongside existing D&D 5e monsters.

---

## Overview

Add Pathfinder 2e creature support by:
1. Converting all 129 PF2eTools bestiary JSON files into markdown files
2. Seeding them into the existing Monster collection with a `gameSystem: 'pf2e'` discriminator
3. Adding a "PF2E" tab to the left panel with full browse, search, create, and import functionality
4. Full feature parity with the 5e "Monsters" tab — same UX, different content

All PF2eTools data is OGL/ORC licensed and can be shipped.

---

## Architecture Decision: Game System Abstraction

Single `Monster` collection with a `gameSystem` field (`'5e'` or `'pf2e'`). Same API endpoints with a `gameSystem` query parameter. Same UI components with a `gameSystem` prop. The `rawMarkdown` field handles format differences — a PF2e stat block renders differently because the markdown content is different, not because the viewer is different.

This avoids duplicating models, routes, hooks, and components.

---

## 1. PF2e JSON → Markdown Converter

### Script: `scripts/convertPf2eToMarkdown.js`

**Input:** PF2eTools `data/bestiary/creatures-*.json` files (129 files, stored locally).

**Output:** Markdown files at `Monsters/pf2e_{sourceKey}/{slug}.md`, one per creature.

### Source Key Mapping

Each PF2eTools `source` code maps to a folder and display label:

| Source Code | sourceKey | Display Label | Folder |
|---|---|---|---|
| B1 | pf2e_b1 | Bestiary 1 | `pf2e_b1/` |
| B2 | pf2e_b2 | Bestiary 2 | `pf2e_b2/` |
| B3 | pf2e_b3 | Bestiary 3 | `pf2e_b3/` |
| BB | pf2e_bb | Beginner Box | `pf2e_bb/` |
| (etc. for all 129 files) | pf2e_{code.toLowerCase()} | (derived from filename or internal mapping) | pf2e_{code}/ |

The full mapping table will be built by scanning all 129 files and extracting unique `source` values.

### Template Tag Stripping

PF2eTools uses `{@tag content}` template tags throughout creature text. The converter must strip these to plain text:

| Tag Pattern | Output |
|---|---|
| `{@damage 1d6+1}` | `1d6+1` |
| `{@dice 1d4}` | `1d4` |
| `{@dc 17}` | `DC 17` |
| `{@condition enfeebled 2}` | `enfeebled 2` |
| `{@spell lay on hands}` | `lay on hands` |
| `{@action Strike\|\|Strikes}` | `Strikes` (use display text after `\|\|`) |
| `{@skill Deception}` | `Deception` |
| `{@ability str}` | `Strength` |
| `{@trait aura}` | `aura` |
| `{@quickref ...}` | (strip entirely or extract display text) |

Generic stripping rule: `{@tag content}` → `content`. For tags with `||`, use the text after `||` as display text: `{@tag ref||display}` → `display`.

### Markdown Format

Each creature produces a markdown file in this format:

```markdown
# {Name}
*Creature {Level}*

{Traits as comma-separated list: rarity, alignment, size, creature traits}

---

**Perception** +{perception}; {senses comma-separated}
**Languages** {languages comma-separated}
**Skills** {skill} +{mod}, {skill} +{mod}, ...
**STR** +{str}, **DEX** +{dex}, **CON** +{con}, **INT** +{int}, **WIS** +{wis}, **CHA** +{cha}
{**Items** item1, item2, ... (if items array present)}

{top abilities rendered here, each as **Name** (traits) description}

---

**AC** {ac}{; variant acs if present}; **Fort** +{fort}, **Ref** +{ref}, **Will** +{will}{; save abilities}
**HP** {hp}{; hp abilities like "fast healing 2"}
{**Immunities** list (if present)}
{**Resistances** list (if present)}
{**Weaknesses** list (if present)}

{mid abilities rendered here — reactions with ◆ markers, auras, etc.}

---

{**Melee** ◆ {name} +{attack} [{traits}], **Damage** {damage} (for each melee attack)}
{**Ranged** ◆ {name} +{attack} [{traits}], **Damage** {damage} (for each ranged attack)}

{**Spellcasting** blocks — "{Type} {Tradition} DC {dc}; {level}: {spells}" per casting entry}

{bot abilities rendered here — breath weapons, special actions, etc.}
```

### Action Cost Symbols

PF2e uses an action economy with 1/2/3 action costs and reactions/free actions:

| `activity.unit` | `activity.number` | Symbol |
|---|---|---|
| `action` | 1 | ◆ |
| `action` | 2 | ◆◆ |
| `action` | 3 | ◆◆◆ |
| `reaction` | 1 | ◆ (reaction) — render as "**Name** ◆" |
| `free` | 1 | ◇ |

### Ability Rendering

Abilities have optional fields: `activity`, `trigger`, `frequency`, `requirements`, `traits`, `entries`.

Render as:
```
**{Name}** {action symbols} ({traits joined}) {**Trigger** text;} {**Frequency** text;} {**Requirements** text;} {entries joined as paragraphs}
```

List entries (`"type": "list"`) render as bullet points within the ability text.

### Edge Cases

- **Multiple HP pools**: `defenses.hp` is an array. Rare but exists. Render each pool.
- **Variant ACs**: `defenses.ac` can have multiple keys (`"std": 23, "with shield raised": 25`). Render as "AC 23 (25 with shield raised)".
- **Save abilities**: `defenses.savingThrows.abilities` is an optional array of strings like "+1 status to all saves vs. magic".
- **Speed variants**: `speed` object can have `walk`, `fly`, `burrow`, `swim`, `climb`. Render as "Speed 20 feet, fly 40 feet, burrow 30 feet".
- **Generic abilities**: Some abilities have `"generic": {"tag": "ability"}` which means they reference a standard rule (like Shield Block). Render the name, let the DM look up the rule.
- **Spellcasting with `amount`**: Some spells have `"amount": "at will"`. Render as "spell (at will)".
- **Spellcasting with `notes`**: Some spells have `"notes": ["see desert thirst"]`. Render as "spell (see desert thirst)".
- **Cantrips**: Spells at level `"0"` with an explicit `"level"` override (e.g., `"level": 8`). Render as "Cantrips (8th) spell".
- **Focus spells**: Casting entries with `"type": "Focus"` and `"fp"` (focus points). Render as "Champion Devotion Spells (1 Focus Point); 3rd: lay on hands".
- **`foundIn` and `otherSources`**: Informational only. Not rendered in stat block.
- **`hasImages`**: Ignored. We don't ship images.

---

## 2. Seed Script & Data Pipeline

### Seed Script Changes (`scripts/seedMonsters.js`)

Add a new PF2e parser alongside existing 5.1/5.2/BlackFlag/etc parsers:

- Reads markdown files from `Monsters/pf2e_*/` directories
- Extracts: name (from `# Heading`), level (from `*Creature N*`), traits line, AC, HP, Fort/Ref/Will, Perception, ability modifiers, speed
- Sets `gameSystem: 'pf2e'`
- Sets `sourceKey` from folder name (e.g., `pf2e_b1`)
- Sets `source` from a lookup table mapping sourceKey → display label
- Calculates `crNumeric` from level (for sort/filter — stores the raw level number)
- Calculates `initMod` from Perception modifier
- Stores `rawMarkdown` as the full file content

### Monster Model Changes (`server/models/Monster.js`)

Add one field:

```js
gameSystem: { type: String, enum: ['5e', 'pf2e'], default: '5e', index: true }
```

Existing 5e monsters get `'5e'` by default (schema default). PF2e seeded monsters get `'pf2e'` explicitly.

### Seed Command

Add a new npm script:

```json
"seed:pf2e": "node scripts/seedMonsters.js --pf2e"
```

Or detect PF2e folders automatically alongside 5e folders. The seed script should handle both systems in one run.

---

## 3. API & Query Layer

### Route Changes (`server/routes/monsters.js`)

**`GET /api/monsters/search`**:
- Add `gameSystem` query param. Defaults to `'5e'`.
- Filter chain: `{ gameSystem, ...existingFilters }`.
- When PF2e, the `cr` filter param is interpreted as Level (but the field is still `crNumeric`).

**`GET /api/monsters/sources`**:
- Add `gameSystem` query param. Defaults to `'5e'`.
- Aggregates only sources matching that game system.

**`GET /api/monsters/:slug`**:
- No change. Slugs are globally unique (prefixed with sourceKey like `pf2e_b1--ancient-blue-dragon`).

### Validator Changes (`server/validators/monsters.js`)

Add `gameSystem` to search query validation: `z.enum(['5e', 'pf2e']).default('5e')`.

### Client Hook Changes (`client/src/api/useMonsters.js`)

- `useMonsterBrowse(filters)` — accept `gameSystem` in filters, pass to API
- `useMonsterSearch(query, gameSystem)` — add gameSystem param
- `useMonsterSources(gameSystem)` — filter by game system
- `useMonster(slug)` — unchanged

---

## 4. UI: 4-Tab Left Panel

### Tab Layout

The left panel (`LeftPanel.jsx`) changes from 3 tabs to 4:

```
[ 5E ] [ PF2E ] [ CHARACTERS ] [ ENCOUNTERS ]
```

- "MONSTERS" tab renamed to "5E"
- New "PF2E" tab added
- "CHARACTERS" and "ENCOUNTERS" unchanged

### Component Architecture

The current `MonsterDatabase.jsx` component already handles search, filter, browse, and detail view. Rather than duplicating it:

- Extract the game-system-specific parts (source mappings, badge constants, form fields) into props/config
- `MonsterDatabase` accepts a `gameSystem` prop
- The 5E tab renders `<MonsterDatabase gameSystem="5e" />`
- The PF2E tab renders `<MonsterDatabase gameSystem="pf2e" />`

Both tabs share the same component, same UX, same search/filter flow. The difference is the data they query and the source filter options they show.

### Source Constants

New file: `client/src/constants/pf2eSources.js`

Maps PF2e source keys to display labels and badge abbreviations, mirroring the existing `monsterSources.js` pattern. The MonsterDatabase component selects which constant file to use based on `gameSystem`.

### CR vs Level Display

When `gameSystem === 'pf2e'`:
- The filter dropdown label changes from "All CRs" to "All Levels"
- Filter options show "Level 1", "Level 2", etc. instead of "CR 1", "CR 1/2", etc.
- Monster result cards show "Lvl 5" badge instead of "CR 5" badge
- The numeric field (`crNumeric`) is the same — just the labels change

---

## 5. Custom Monsters & Import (PF2e)

### Custom Creation (`MonsterFormModal`)

The form detects `gameSystem` from which tab launched it:

**When `gameSystem === 'pf2e'`:**
- **Level** field (number 1-25) replaces **CR** dropdown
- **Perception** field (number, the modifier) added
- **Ability Scores** section shows modifier inputs (-5 to +10) instead of score inputs (1-30)
- **Saves**: Fort/Ref/Will modifier inputs instead of generic `savingThrows` text
- **Traits** section (rarity, size, creature type tags)
- Sections like Actions, Reactions, etc. remain the same (text fields)

Custom PF2e creatures are stored with `gameSystem: 'pf2e'` and `sourceKey: 'custom-pf2e'`.

### Import (`ImportMonsterModal`)

- Add a game system toggle at the top of the import modal
- When PF2e is selected, the parser accepts PF2eTools JSON format natively
- Reuses the same template tag stripping logic from the converter script (extract into shared util)
- Generates `rawMarkdown` from the JSON using the same rendering logic
- Saves with `gameSystem: 'pf2e'`

### UserData Sync

The existing `customMonsters` array in the UserData model and Zustand store handles both systems. Custom PF2e creatures are just custom monsters with `gameSystem: 'pf2e'`. The `customMonsterSchema` validator gets a `gameSystem` field added: `z.enum(['5e', 'pf2e']).default('5e')`.

---

## Files Affected (Summary)

### New Files
| File | Purpose |
|------|---------|
| `scripts/convertPf2eToMarkdown.js` | PF2eTools JSON → markdown converter |
| `client/src/constants/pf2eSources.js` | PF2e source key → label/badge mapping |
| `Monsters/pf2e_*/` | ~3000+ generated markdown files (gitignored or committed) |

### Modified Files
| File | Changes |
|------|---------|
| `server/models/Monster.js` | Add `gameSystem` field |
| `server/routes/monsters.js` | Add `gameSystem` filter to search and sources endpoints |
| `server/validators/monsters.js` | Add `gameSystem` to search validation |
| `scripts/seedMonsters.js` | Add PF2e markdown parser, PF2e source mappings |
| `client/src/api/useMonsters.js` | Pass `gameSystem` through all hooks |
| `client/src/components/tracker/LeftPanel.jsx` | 4 tabs instead of 3, pass `gameSystem` to MonsterDatabase |
| `client/src/components/tracker/MonsterDatabase.jsx` | Accept `gameSystem` prop, conditional CR/Level labels, select source constants |
| `client/src/components/monsters/MonsterFormModal.jsx` | Game-system-aware form fields |
| `client/src/components/monsters/ImportMonsterModal.jsx` | Game system toggle, PF2e JSON parser |
| `client/src/constants/monsterSources.js` | No change (5e only) |
| `client/src/utils/monsterImport.js` | PF2e JSON normalization path |
| `client/src/utils/monsterFormHelpers.js` | PF2e form constants (levels, mod ranges) |
| `server/validators/userData.js` | Add `gameSystem` to customMonsterSchema |

### Shared Utility (New)
| File | Purpose |
|------|---------|
| `scripts/pf2eMarkdownRenderer.js` | Shared logic: PF2e JSON → markdown (used by converter script AND import modal) |

This renderer is a pure function (JSON → string) with no Node/browser dependencies. Place it in `shared/pf2eMarkdownRenderer.js` at the repo root. Both `scripts/convertPf2eToMarkdown.js` and `client/src/utils/monsterImport.js` import from this shared location. Vite can resolve imports outside `client/src/` with a path alias or relative import.

---

## Out of Scope

- PF2e hazards (not creatures)
- PF2e creature images
- Cross-system encounter balancing (mixing 5e and PF2e CR/Level in difficulty calculations)
- PF2e-specific dice roller features (no changes to DiceRoller component)
- Automatic updates from PF2eTools upstream — converter is run manually
- PF2e condition tracking (conditions are just text in stat blocks)

---

## Testing

- Converter: run on all 129 files, verify markdown output for simple (Air Mephit), medium (Aasimar Redeemer), and complex (Ancient Blue Dragon) creatures
- Seed: verify PF2e creatures appear in DB with correct `gameSystem`, `sourceKey`, `crNumeric`
- API: verify `gameSystem` filter returns only matching creatures, sources endpoint returns only matching sources
- UI: verify 4 tabs work, PF2e tab shows PF2e creatures only, source filter shows PF2e sources
- Custom: verify creating a custom PF2e creature saves with `gameSystem: 'pf2e'` and appears in PF2e tab only
- Import: verify PF2eTools JSON import works, template tags stripped, rawMarkdown renders correctly
- Stat block viewer: verify PF2e stat block renders correctly with Level, Fort/Ref/Will, action costs
- Run `npm run lint` and `npm run build` to verify no regressions
- Verify 5e tab is completely unaffected by all changes

---

## Data Decisions

- **Generated markdown files**: Commit to repo (like existing 5e markdown files). They're the source of truth after conversion.
- **PF2eTools JSON files**: Not committed. Downloaded temporarily for conversion, then discarded.
- **`crNumeric` for PF2e**: Stores the Level number directly (1-25). This means the same field serves as CR for 5e and Level for PF2e, which works because they're never mixed in the same query (filtered by `gameSystem`).
- **`initMod` for PF2e**: Derived from Perception modifier (PF2e uses Perception for initiative by default).
- **Ability scores**: PF2e stores modifiers natively. The `abilities` object in the Monster model stores numbers — for 5e these are scores (10-30), for PF2e these are modifiers (-5 to +10). The `gameSystem` field determines interpretation. The stat block display comes from `rawMarkdown` so this only affects the custom creation form.
