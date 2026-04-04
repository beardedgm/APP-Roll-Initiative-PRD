# D&D 5e Monster JSON Schema for Roll Initiative

This document defines the JSON schema that Roll Initiative's import system accepts for D&D 5e monsters. The importer supports three input formats: custom format (documented here), Open5e API format, and 5etools format. All are normalized internally.

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Monster name. Max 100 chars. |
| `size` | string | **Yes** | `"Tiny"`, `"Small"`, `"Medium"`, `"Large"`, `"Huge"`, or `"Gargantuan"`. Also accepts 5etools single letters: T, S, M, L, H, G. |
| `type` | string | **Yes** | Creature type (e.g., `"beast"`, `"undead"`, `"dragon"`, `"humanoid"`). Can also be an object: `{ "type": "humanoid", "tags": ["elf"] }`. |
| `alignment` | string | No | Alignment string (e.g., `"chaotic evil"`, `"unaligned"`, `"any alignment"`). |
| `ac` | integer or array | **Yes** | Armor Class. Integer: `15`. Or 5etools format: `[{ "ac": 15, "from": ["natural armor"] }]`. |
| `acDesc` | string | No | AC description (e.g., `"natural armor"`, `"plate armor, shield"`). Auto-extracted from 5etools `from` array. |
| `hp` | integer or object | **Yes** | Hit points. Integer: `45`. Or 5etools format: `{ "average": 45, "formula": "6d8+18" }`. |
| `hpFormula` | string | No | Hit dice formula (e.g., `"6d8 + 18"`). Auto-extracted from 5etools/Open5e formats. |
| `speed` | string or object | **Yes** | Speed. String: `"30 ft."`. Or object: `{ "walk": 30, "fly": 60, "swim": 30 }`. |
| `cr` | string | **Yes** | Challenge Rating. Valid values: `"0"`, `"1/8"`, `"1/4"`, `"1/2"`, `"1"` through `"30"`. Also accepts numeric: `0.125` → `"1/8"`. |
| `abilities` | object | **Yes** | See [Ability Scores](#ability-scores). |
| `initMod` | integer | No | Initiative modifier. If omitted, derived from DEX: `floor((dex - 10) / 2)`. |
| `traits` | array | No | See [Traits / Special Abilities](#traits--special-abilities). |
| `actions` | array | No | See [Actions](#actions). |
| `reactions` | array | No | Same format as actions. |
| `legendaryActions` | array | No | Same format as actions. |
| `senses` | string | No | Senses text (e.g., `"darkvision 60 ft., passive Perception 13"`). |
| `languages` | string | No | Languages text (e.g., `"Common, Draconic"` or `"—"`). |
| `savingThrows` | string | No | Saving throw bonuses (e.g., `"Dex +5, Wis +3"`). |
| `skills` | string | No | Skill bonuses (e.g., `"Perception +5, Stealth +7"`). |
| `damageResistances` | string | No | Damage resistances (e.g., `"bludgeoning, piercing, and slashing from nonmagical attacks"`). |
| `damageImmunities` | string | No | Damage immunities (e.g., `"fire, poison"`). |
| `damageVulnerabilities` | string | No | Damage vulnerabilities (e.g., `"cold"`). |
| `conditionImmunities` | string | No | Condition immunities (e.g., `"charmed, frightened, poisoned"`). |
| `rawMarkdown` | string | No | Pre-rendered stat block markdown. If provided, used as-is instead of auto-generating from fields. Max 50,000 chars. |

---

## Ability Scores

```json
{
  "str": 16, "dex": 12, "con": 16, "int": 2, "wis": 12, "cha": 6
}
```

**These are ability scores (1-30), NOT modifiers.** The app calculates modifiers automatically: `floor((score - 10) / 2)`.

| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `str` | integer | **Yes** | 1-30 | Strength score. |
| `dex` | integer | **Yes** | 1-30 | Dexterity score. |
| `con` | integer | **Yes** | 1-30 | Constitution score. |
| `int` | integer | **Yes** | 1-30 | Intelligence score. |
| `wis` | integer | **Yes** | 1-30 | Wisdom score. |
| `cha` | integer | **Yes** | 1-30 | Charisma score. |

**Alternate field names** (Open5e format): `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma` are also accepted.

---

## Traits / Special Abilities

```json
[
  {
    "name": "Keen Senses",
    "description": "The monster has advantage on Wisdom (Perception) checks that rely on smell."
  },
  {
    "name": "Pack Tactics",
    "description": "The monster has advantage on an attack roll against a creature if at least one of the monster's allies is within 5 feet of the creature and the ally isn't incapacitated."
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Trait name. |
| `description` | string | **Yes** | Full trait text. |

**Alternate field names**: `desc`, `text`, `entries` (array, joined with newlines) are also accepted for the description.

---

## Actions

```json
[
  {
    "name": "Multiattack",
    "description": "The dragon makes three attacks: one with its bite and two with its claws."
  },
  {
    "name": "Bite",
    "description": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage."
  },
  {
    "name": "Fire Breath (Recharge 5-6)",
    "description": "The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one."
  }
]
```

Same structure as traits. Reactions and legendary actions use the identical format.

---

## Speed Formats

The importer accepts three speed formats:

**String (simplest):**
```json
"speed": "30 ft., fly 60 ft., swim 30 ft."
```

**Object (5etools/Open5e):**
```json
"speed": {
  "walk": 30,
  "fly": 60,
  "swim": 30
}
```

**Object with details:**
```json
"speed": {
  "walk": 30,
  "fly": { "number": 60 },
  "swim": 30
}
```

All formats are normalized to a string like `"30 ft., fly 60 ft., swim 30 ft."`.

---

## AC Formats

**Integer (simplest):**
```json
"ac": 15,
"acDesc": "natural armor"
```

**5etools array:**
```json
"ac": [{ "ac": 15, "from": ["natural armor"] }]
```

**Open5e:**
```json
"armor_class": 15
```

---

## HP Formats

**Integer (simplest):**
```json
"hp": 45,
"hpFormula": "6d8 + 18"
```

**5etools object:**
```json
"hp": { "average": 45, "formula": "6d8+18" }
```

**Open5e:**
```json
"hit_points": 45,
"hit_dice": "6d8+18"
```

---

## CR Formats

**String (preferred):**
```json
"cr": "3"
```

Fractional CRs: `"1/8"`, `"1/4"`, `"1/2"`.

**Numeric:**
```json
"cr": 0.25
```
Auto-converted: `0.125` → `"1/8"`, `0.25` → `"1/4"`, `0.5` → `"1/2"`.

**5etools object:**
```json
"cr": { "cr": "3", "lair": "4" }
```

**Open5e:**
```json
"challenge_rating": "3"
```

---

## String vs Object Fields

Several fields accept both string and object/array formats. The importer normalizes them:

| Field | String Format | Object/Array Format |
|-------|--------------|-------------------|
| `savingThrows` | `"Dex +5, Wis +3"` | `{ "dex": "+5", "wis": "+3" }` → normalized to string |
| `skills` | `"Perception +5, Stealth +7"` | `{ "perception": "+5", "stealth": "+7" }` → normalized to string |
| `senses` | `"darkvision 60 ft."` | Same format → kept as string |
| `languages` | `"Common, Draconic"` | Same format → kept as string |
| `damageResistances` | `"fire, cold"` | `["fire", "cold"]` → joined with `", "` |
| `damageImmunities` | `"poison"` | `["poison"]` → joined with `", "` |
| `damageVulnerabilities` | `"cold"` | `["cold"]` → joined with `", "` |
| `conditionImmunities` | `"charmed, frightened"` | `["charmed", "frightened"]` → joined with `", "` |

---

## Wrapper Formats

The importer auto-detects these wrapper formats:

**5etools:**
```json
{
  "monster": [
    { ... monster 1 ... },
    { ... monster 2 ... }
  ]
}
```

**Open5e:**
```json
{
  "results": [
    { ... monster 1 ... },
    { ... monster 2 ... }
  ]
}
```

When wrapped, only the **first monster** is imported.

---

## Validation Rules

The importer validates after normalization:
- `name`: Required, max 100 characters.
- `size`: Must be one of: Tiny, Small, Medium, Large, Huge, Gargantuan.
- `type`: Required, non-empty.
- `ac`: Must be a number 0-99.
- `hp`: Must be a number >= 1.
- `cr`: Must be a valid 5e CR (0, 1/8, 1/4, 1/2, 1-30).
- `abilities`: Each score must be 1-30.
- `rawMarkdown`: If provided, max 50,000 characters.

---

## Complete Example

```json
{
  "name": "Young Red Dragon",
  "size": "Large",
  "type": "dragon",
  "alignment": "chaotic evil",
  "ac": 18,
  "acDesc": "natural armor",
  "hp": 178,
  "hpFormula": "17d10 + 85",
  "speed": "40 ft., climb 40 ft., fly 80 ft.",
  "cr": "10",
  "abilities": {
    "str": 23, "dex": 10, "con": 21, "int": 14, "wis": 11, "cha": 19
  },
  "savingThrows": "Dex +4, Con +9, Wis +4, Cha +8",
  "skills": "Perception +8, Stealth +4",
  "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 18",
  "languages": "Common, Draconic",
  "damageImmunities": "fire",
  "traits": [
    {
      "name": "Multiattack",
      "description": "The dragon makes three attacks: one with its bite and two with its claws."
    }
  ],
  "actions": [
    {
      "name": "Bite",
      "description": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage."
    },
    {
      "name": "Claw",
      "description": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage."
    },
    {
      "name": "Fire Breath (Recharge 5-6)",
      "description": "The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one."
    }
  ],
  "reactions": [],
  "legendaryActions": []
}
```

---

## Auto-Generated Fields

The importer automatically generates:
- **`initMod`**: Derived from DEX score if not provided: `floor((dex - 10) / 2)`.
- **`gameSystem`**: Set to `"5e"`.
- **Stat block markdown**: Auto-generated from all fields if `rawMarkdown` is not provided.
