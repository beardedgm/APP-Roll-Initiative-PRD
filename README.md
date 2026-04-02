# Roll Initiative

A combat encounter tracker for **D&D 5e** and **Pathfinder 2e** with a built-in monster database of 5,700+ creatures, clickable dice rolls, and cloud-synced character/encounter saves.

**Live:** [initiative-x4m0.onrender.com](https://initiative-x4m0.onrender.com)

## Features

### Combat Tracker
- Add players, monsters, and NPCs with HP, AC, and initiative modifier
- Quantity field for adding multiple identical monsters (auto-numbered)
- Start Combat modal with manual player initiatives and auto-rolled monster initiatives
- Turn order tracking with HP bars, AC display, damage/heal controls
- Next Turn / Previous Turn with round counter (spacebar shortcut for Next)
- Undo / Redo for all encounter changes (Ctrl+Z / Ctrl+Y)
- Smart Enter key on HP input (remembers last action; Shift+Enter for opposite)

### Monster Database (5,700+ Creatures)
- **D&D 5e**: 3,100+ creatures across 8 sources (SRD 5.1, SRD 5.2, A5E, Black Flag, Creature Codex, Tome of Beasts 1/2/3)
- **Pathfinder 2e**: 2,600+ creatures across 79 sources (Bestiary 1-3, GMG, APG, 70+ adventure paths)
- 4-tab layout: **5E | PF2E | Characters | Encounters**
- Search, filter by source and CR/Level, paginated browsing
- Clickable stat blocks: dice notation (2d6+5) and modifiers (+10) roll on click
- Resizable left panel (drag handle between monster list and combat tracker)

### Custom Monsters
- Create custom creatures via form (5e or PF2e fields)
- Import from JSON (supports 5etools, Open5e, PF2eTools, and custom format)
- Custom creatures saved to your account and synced across devices

### Characters & Encounters
- Save player characters with HP, AC, and initiative modifier
- Save and load encounter presets (full combat state including dice history)
- Cloud sync when logged in (auto-saves to server)

### Dice Roller
- All standard TTRPG dice: d4, d6, d8, d10, d12, d20, d100
- Multi-dice rolls, advantage/disadvantage toggle
- Roll history with re-roll buttons
- Toast notifications for recent rolls

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| State | Zustand (client) + TanStack Query (server) |
| Auth | Session-based (HTTP-only cookies) |
| Payments | Stripe Checkout + Webhooks |
| Hosting | Render |

## Getting Started

```bash
# Install dependencies
npm install && cd client && npm install && cd ../server && npm install && cd ..

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI and other config

# Seed the monster database (5e + PF2e)
npm run seed:monsters

# Start development
npm run dev                   # Server (:3000) + Client (:5173)
```

## Importing Monsters (JSON)

The import modal accepts JSON for both D&D 5e and Pathfinder 2e creatures. Click **Import JSON** on either the 5E or PF2E tab.

### D&D 5e JSON Schema

Supports 5etools (`{ "monster": [...] }`), Open5e (`{ "results": [...] }`), or the custom format below:

```json
{
  "name": "Custom Monster",
  "size": "Medium",
  "type": "beast",
  "alignment": "unaligned",
  "ac": 13,
  "acDesc": "natural armor",
  "hp": 45,
  "hpFormula": "6d8 + 18",
  "speed": "30 ft.",
  "cr": "3",
  "abilities": {
    "str": 16,
    "dex": 12,
    "con": 16,
    "int": 2,
    "wis": 12,
    "cha": 6
  },
  "savingThrows": "Con +5",
  "skills": "Perception +3, Stealth +3",
  "senses": "darkvision 60 ft., passive Perception 13",
  "languages": "understands Common but can't speak",
  "damageResistances": "",
  "damageImmunities": "poison",
  "damageVulnerabilities": "",
  "conditionImmunities": "poisoned",
  "traits": [
    {
      "name": "Keen Senses",
      "description": "The monster has advantage on Wisdom (Perception) checks that rely on smell."
    }
  ],
  "actions": [
    {
      "name": "Bite",
      "description": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage."
    }
  ],
  "reactions": [],
  "legendaryActions": []
}
```

#### 5e Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Creature name (max 100 chars) |
| `size` | string | No | Tiny, Small, Medium, Large, Huge, Gargantuan |
| `type` | string | No | Creature type (beast, fiend, undead, etc.) |
| `alignment` | string | No | Lawful Good, Chaotic Evil, Unaligned, etc. |
| `ac` | number | No | Armor class (0-99) |
| `acDesc` | string | No | AC description (e.g. "natural armor") |
| `hp` | number | No | Hit points (minimum 1) |
| `hpFormula` | string | No | HP dice formula (e.g. "6d8 + 18") |
| `speed` | string | No | Movement speed (e.g. "30 ft., fly 60 ft.") |
| `cr` | string | No | Challenge rating: "0", "1/8", "1/4", "1/2", or "1"-"30" |
| `abilities` | object | No | `{ str, dex, con, int, wis, cha }` — scores 1-30 |
| `savingThrows` | string | No | e.g. "Dex +5, Con +3" |
| `skills` | string | No | e.g. "Perception +5, Stealth +4" |
| `senses` | string | No | e.g. "darkvision 60 ft., passive Perception 13" |
| `languages` | string | No | e.g. "Common, Draconic" |
| `damageResistances` | string | No | e.g. "Fire, Cold" |
| `damageImmunities` | string | No | e.g. "Poison" |
| `damageVulnerabilities` | string | No | e.g. "Radiant" |
| `conditionImmunities` | string | No | e.g. "Poisoned, Frightened" |
| `traits` | array | No | `[{ name, description }]` — special abilities |
| `actions` | array | No | `[{ name, description }]` — action entries |
| `reactions` | array | No | `[{ name, description }]` — reaction entries |
| `legendaryActions` | array | No | `[{ name, description }]` — legendary action entries |
| `rawMarkdown` | string | No | Full stat block markdown (overrides auto-generated display) |

### Pathfinder 2e JSON Schema

Supports PF2eTools format (`{ "creature": [...] }`) or the custom format below. This example shows a homebrew creature with spellcasting:

```json
{
  "name": "Bloom Cultist",
  "level": 5,
  "traits": ["Rare", "CE", "Medium", "Human", "Humanoid"],
  "perception": {
    "std": 13
  },
  "languages": {
    "languages": [{ "name": "Abyssal" }, { "name": "Common" }]
  },
  "skills": [
    { "name": "Deception", "std": 11 },
    { "name": "Intimidation", "std": 11 },
    { "name": "Nature", "std": 13 },
    { "name": "Religion", "std": 13 }
  ],
  "abilityMods": {
    "str": 3,
    "dex": 3,
    "con": 2,
    "int": 0,
    "wis": 4,
    "cha": 0
  },
  "defenses": {
    "ac": { "std": 22 },
    "savingThrows": {
      "fort": { "std": 11 },
      "ref": { "std": 12 },
      "will": { "std": 15 }
    },
    "hp": [{ "hp": 75 }],
    "immunities": [],
    "resistances": [],
    "weaknesses": []
  },
  "speed": {
    "walk": 25
  },
  "attacks": [
    {
      "type": "melee",
      "name": "kukri",
      "attack": 13,
      "traits": ["agile", "finesse", "trip"],
      "damage": "1d6+5 slashing"
    }
  ],
  "abilities": {
    "top": [
      {
        "name": "Items",
        "entries": ["+1 kukri, robes"]
      }
    ],
    "mid": [],
    "bot": [
      {
        "name": "Absorb the Bloom",
        "traits": ["divine", "manipulate", "necromancy"],
        "entries": ["The bloom cultist places a hand against the wall or floor in the Cradle of Lamashtu and utters a prayer to the Mother of Monsters. Filaments of fungus slither up into the cultist's flesh, healing 4d6 points of damage. The cultist can't Absorb the Bloom for 24 hours."]
      }
    ]
  },
  "spellcasting": [
    {
      "name": "Divine Spells Prepared",
      "type": "Prepared",
      "tradition": "divine",
      "DC": 21,
      "attack": 13,
      "spells": [
        { "level": 3, "spells": ["chilling darkness", "harm"] },
        { "level": 2, "spells": ["dispel magic", "heal", "spiritual weapon"] },
        { "level": 1, "spells": ["alarm", "command", "ray of enfeeblement"] },
        { "level": 0, "spells": ["divine lance", "forbidding ward", "message", "read aura", "shield"] }
      ]
    },
    {
      "name": "Rituals",
      "rituals": ["monstrous bloom"]
    }
  ]
}
```

#### PF2e Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Creature name (max 100 chars) |
| `level` | number | Yes | Creature level (-1 to 25) |
| `traits` | array | No | Trait strings: alignment, size, type (e.g. ["N", "Large", "Beast"]) |
| `perception.std` | number | No | Perception modifier (also used as initiative) |
| `perception.senses` | array | No | `[{ name }]` — darkvision, scent, etc. |
| `languages.languages` | array | No | `[{ name }]` — known languages |
| `skills` | array | No | `[{ name, std }]` — skill name and modifier |
| `abilityMods` | object | No | `{ str, dex, con, int, wis, cha }` — modifiers (-5 to +10) |
| `defenses.ac.std` | number | No | Standard AC value |
| `defenses.savingThrows` | object | No | `{ fort: { std }, ref: { std }, will: { std } }` |
| `defenses.hp` | array | No | `[{ hp, name?, abilities? }]` — HP pools |
| `defenses.immunities` | array | No | `[{ name }]` or string array |
| `defenses.resistances` | array | No | `[{ name, amount }]` |
| `defenses.weaknesses` | array | No | `[{ name, amount }]` |
| `speed` | object | No | `{ walk, fly?, swim?, burrow?, climb? }` — in feet |
| `attacks` | array | No | `[{ type, name, attack, traits?, damage }]` |
| `abilities.top` | array | No | Abilities shown before defenses |
| `abilities.mid` | array | No | Abilities shown with defenses (reactions, auras) |
| `abilities.bot` | array | No | Abilities shown after attacks (special actions) |
| `spellcasting` | array | No | Spellcasting blocks (see below) |

**Ability entry:** `{ name, activity?, traits?, trigger?, frequency?, requirements?, entries: [string] }`
- `activity`: `{ unit: "action"|"reaction"|"free", number: 1|2|3 }` — renders as action symbols

**Spellcasting entry:**
```json
{
  "name": "Divine Spells Prepared",
  "type": "Prepared",
  "tradition": "divine",
  "DC": 21,
  "attack": 13,
  "spells": [
    { "level": 3, "spells": ["harm", "heroism"] },
    { "level": 0, "spells": ["shield", "message"] }
  ]
}
```
- `type`: "Prepared", "Spontaneous", or "Innate"
- `tradition`: "divine", "arcane", "occult", or "primal"
- `spells[].level`: 0 for cantrips, 1-10 for leveled spells
- `rituals`: optional string array for ritual names

## Scripts

```bash
npm run dev                   # Start dev server + client
npm run dev:client            # Vite only (frontend work)
npm run dev:server            # Express only (API work)
npm run seed:monsters         # Seed all 5e + PF2e creatures into MongoDB
npm run seed:pf2e-convert -- <path>  # Convert PF2eTools JSON to markdown
cd client && npx vite build   # Production build
cd server && npx eslint .     # Lint server code
```

## License

MIT
