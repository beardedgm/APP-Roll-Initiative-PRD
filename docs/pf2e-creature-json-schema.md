# PF2e Creature JSON Schema for Roll Initiative

This document defines the JSON schema that Roll Initiative's import system accepts for Pathfinder 2e creatures. Use this as the target format when scraping stat blocks from external sources like Demiplane.

The importer auto-detects PF2e format by checking for `level`, `abilityMods`, or `defenses` fields. It also accepts the wrapper format `{ "creature": [...] }`.

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Creature name. Max 100 chars. |
| `level` | integer | **Yes** | Creature level (-1 to 25). Used as CR equivalent. |
| `traits` | string[] | **Yes** | Array of trait strings. Include alignment code (N, NE, CE, etc.), size (Tiny/Small/Medium/Large/Huge/Gargantuan), rarity if not Common (Uncommon/Rare/Unique), and creature type traits (Beast, Humanoid, Undead, Dragon, etc.). |
| `perception` | object | **Yes** | See [Perception](#perception). |
| `languages` | object | No | See [Languages](#languages). |
| `skills` | array | No | See [Skills](#skills). |
| `abilityMods` | object | **Yes** | See [Ability Modifiers](#ability-modifiers). |
| `defenses` | object | **Yes** | See [Defenses](#defenses). |
| `speed` | object | **Yes** | See [Speed](#speed). |
| `attacks` | array | No | See [Attacks](#attacks). |
| `spellcasting` | array | No | See [Spellcasting](#spellcasting). |
| `abilities` | object | No | See [Abilities](#abilities). |
| `items` | string[] | No | Array of item names the creature carries. |

---

## Perception

```json
{
  "std": 15,
  "senses": [
    { "name": "darkvision" },
    { "name": "scent", "range": 30, "type": "imprecise" },
    { "name": "tremorsense", "range": 60, "type": "precise" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `std` | integer | **Yes** | Perception modifier (e.g., +15 → `15`). |
| `senses` | array | No | Array of sense objects. |
| `senses[].name` | string | **Yes** | Sense name (darkvision, low-light vision, scent, tremorsense, etc.). |
| `senses[].range` | integer | No | Range in feet. |
| `senses[].type` | string | No | "precise" or "imprecise". |

---

## Languages

```json
{
  "languages": [
    { "name": "Common" },
    { "name": "Draconic" }
  ],
  "abilities": ["telepathy 100 feet"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `languages` | array | No | Array of language objects. |
| `languages[].name` | string | **Yes** | Language name. |
| `abilities` | string[] | No | Language-related abilities (e.g., "telepathy 100 feet", "speak with animals"). |

---

## Skills

```json
[
  { "name": "Athletics", "std": 14 },
  { "name": "Stealth", "std": 16, "note": "in forests" }
]
```

Array of skill objects. Can also be an object format: `{ "athletics": { "std": 14 } }`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Skill name (capitalized). |
| `std` | integer | **Yes** | Skill modifier. |
| `note` | string | No | Conditional bonus note. |

---

## Ability Modifiers

```json
{
  "str": 4, "dex": 2, "con": 3, "int": -2, "wis": 1, "cha": 0
}
```

**These are modifiers (-5 to +10), NOT ability scores.** PF2e uses modifiers directly, unlike 5e which uses scores 1-30.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `str` | integer | **Yes** | Strength modifier. |
| `dex` | integer | **Yes** | Dexterity modifier. |
| `con` | integer | **Yes** | Constitution modifier. |
| `int` | integer | **Yes** | Intelligence modifier. |
| `wis` | integer | **Yes** | Wisdom modifier. |
| `cha` | integer | **Yes** | Charisma modifier. |

---

## Defenses

```json
{
  "ac": { "std": 24, "with shield raised": 26 },
  "savingThrows": {
    "fort": { "std": 15 },
    "ref": { "std": 12 },
    "will": { "std": 17 },
    "abilities": ["+1 status to all saves vs. magic"]
  },
  "hp": [
    { "hp": 120 },
    { "hp": 30, "name": "shield", "abilities": ["hardness 10"] }
  ],
  "immunities": ["sleep", { "name": "poison" }],
  "resistances": [{ "name": "physical", "amount": 5, "note": "except cold iron" }],
  "weaknesses": [{ "name": "fire", "amount": 5 }]
}
```

### AC

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `std` | integer | **Yes** | Base AC value. |
| *(other keys)* | integer | No | Variant ACs (e.g., `"with shield raised": 26`). |

### Saving Throws

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fort.std` | integer | **Yes** | Fortitude save modifier. |
| `ref.std` | integer | **Yes** | Reflex save modifier. |
| `will.std` | integer | **Yes** | Will save modifier. |
| `abilities` | string[] | No | Save-related abilities (e.g., "+1 status to all saves vs. magic"). |

### HP

Array of HP pool objects. Most creatures have one pool. Some have multiple (e.g., body + shield).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hp` | integer | **Yes** | Hit point value. |
| `name` | string | No | Pool name (for multiple HP pools). |
| `abilities` | string[] | No | HP-related abilities (e.g., "hardness 10", "fast healing 5"). |

### Immunities

Array of strings or objects: `"sleep"` or `{ "name": "poison" }`.

### Resistances / Weaknesses

Array of objects:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Damage type. |
| `amount` | integer | No | Resistance/weakness value. |
| `note` | string | No | Conditional note (e.g., "except cold iron"). |

---

## Speed

```json
{ "walk": 25, "fly": 60, "swim": 40, "climb": 20, "burrow": 15 }
```

Object with movement modes as keys and feet as integer values. Known keys: `walk`, `fly`, `swim`, `climb`, `burrow`. Any other key is treated as a custom movement mode.

Optional fields:
- `abilities`: string[] — Speed-related abilities (e.g., "woodland stride").
- `notes`: string — Additional speed notes.

---

## Attacks

```json
[
  {
    "range": "Melee",
    "name": "jaws",
    "attack": 16,
    "traits": ["magical", "reach <10 feet>"],
    "damage": "2d8+5 piercing plus 1d6 fire",
    "effects": ["Grab"]
  },
  {
    "range": "Melee",
    "name": "claw",
    "attack": 16,
    "traits": ["agile"],
    "damage": "2d6+5 slashing"
  },
  {
    "range": "Ranged",
    "name": "rock",
    "attack": 14,
    "traits": ["brutal", "range increment <120 feet>"],
    "damage": "2d10+5 bludgeoning"
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `range` | string | **Yes** | `"Melee"` or `"Ranged"`. |
| `name` | string | **Yes** | Weapon/attack name. |
| `attack` | integer | **Yes** | Attack bonus (first attack only — MAP is calculated automatically: standard -5/-10, agile -4/-8). |
| `traits` | string[] | No | Weapon traits. Include `"agile"` for reduced MAP. Angle brackets for parameters: `"reach <10 feet>"`, `"range increment <120 feet>"`. |
| `damage` | string | **Yes** | Damage expression (e.g., `"2d8+5 piercing plus 1d6 fire"`). |
| `effects` | string[] | No | Additional effects (e.g., `["Grab"]`, `["Knockdown"]`, `["poison"]`). |

**MAP Note:** The renderer automatically calculates Multiple Attack Penalty. If the `traits` array includes `"agile"`, the attack line renders as `+X/+Y/+Z` with -4/-8 penalties. Otherwise, standard -5/-10.

---

## Spellcasting

Array of spellcasting blocks. A creature can have multiple blocks (e.g., Prepared + Innate + Focus).

```json
[
  {
    "name": "Primal Prepared Spells",
    "type": "Prepared",
    "tradition": "primal",
    "DC": 25,
    "attack": 17,
    "entry": {
      "0": {
        "level": 4,
        "spells": [
          { "name": "detect magic" },
          { "name": "produce flame" }
        ]
      },
      "1": {
        "spells": [
          { "name": "fear" },
          { "name": "grease" }
        ]
      },
      "4": {
        "spells": [
          { "name": "fly" }
        ]
      }
    }
  },
  {
    "type": "Innate",
    "tradition": "arcane",
    "DC": 25,
    "entry": {
      "constant": {
        "2": {
          "spells": [{ "name": "see invisibility" }]
        }
      },
      "3": {
        "spells": [
          { "name": "fireball", "amount": "at will" }
        ]
      },
      "5": {
        "spells": [
          { "name": "dominate", "amount": 2 }
        ]
      }
    }
  },
  {
    "name": "Champion Devotion Spells",
    "type": "Focus",
    "tradition": "divine",
    "DC": 22,
    "fp": 2,
    "entry": {
      "3": {
        "spells": [
          { "name": "lay on hands" }
        ]
      }
    }
  }
]
```

### Spellcasting Block

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Display name (e.g., "Primal Prepared Spells"). Auto-generated if omitted. |
| `type` | string | **Yes** | `"Prepared"`, `"Spontaneous"`, `"Innate"`, or `"Focus"`. |
| `tradition` | string | No | `"arcane"`, `"divine"`, `"occult"`, or `"primal"`. |
| `DC` | integer | No | Spell DC. |
| `attack` | integer | No | Spell attack modifier. |
| `fp` | integer | No | Focus points (Focus type only). |
| `entry` | object | **Yes** | Spell levels keyed by rank number. See below. |

### Entry Object

Keys are spell rank numbers as strings: `"0"` (cantrips), `"1"` through `"10"`, and `"constant"` for constant spells.

**Cantrips (key `"0"`):**
```json
{
  "level": 4,
  "spells": [{ "name": "detect magic" }, { "name": "shield" }]
}
```
- `level` (integer): Heightened rank for cantrips. Usually ceil(creature_level / 2).

**Leveled Spells (keys `"1"` through `"10"`):**
```json
{
  "slots": 3,
  "spells": [{ "name": "fireball" }, { "name": "haste" }]
}
```
- `slots` (integer, optional): Number of spell slots at this rank.

**Constant Spells (key `"constant"`):**
```json
{
  "2": {
    "spells": [{ "name": "see invisibility" }]
  },
  "5": {
    "spells": [{ "name": "true seeing" }]
  }
}
```
Nested by rank. These spells are always active.

### Spell Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Spell name. |
| `amount` | string or integer | No | `"at will"` for unlimited, or a number (e.g., `3`) for daily uses. Omit for standard prepared/spontaneous slots. |

---

## Abilities

Three sections, corresponding to their position in the stat block:

```json
{
  "top": [...],
  "mid": [...],
  "bot": [...]
}
```

| Section | Position in Stat Block | Use For |
|---------|----------------------|---------|
| `top` | Before AC/Saves/HP | Passive auras, always-on effects, interaction abilities (Frightful Presence, Coven, Shield Raised) |
| `mid` | Between defenses and offense | Reactions, defensive triggers (Attack of Opportunity, Shield Block, Ferocity, Reactive Strike) |
| `bot` | After attacks/spells | Offensive actions, multi-action activities (Breath Weapon, Draconic Frenzy, Pounce, Change Shape) |

### Ability Object

```json
{
  "name": "Breath Weapon",
  "activity": { "unit": "action", "number": 2 },
  "traits": ["arcane", "evocation", "fire"],
  "trigger": "A creature within reach attempts to move away",
  "frequency": "once per round",
  "requirements": "The dragon has a creature grabbed",
  "entries": [
    "The dragon breathes fire in a 40-foot cone dealing 9d6 fire damage (DC 30 basic Reflex save). It can't use Breath Weapon again for 1d4 rounds."
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Ability name. |
| `activity` | object | No | Action cost. See below. |
| `traits` | string[] | No | Ability traits. |
| `trigger` | string | No | Trigger text (for reactions). |
| `frequency` | string or object | No | Usage frequency. String: `"once per round"`. Object: `{ "entry": "once per day" }`. |
| `requirements` | string | No | Prerequisite text. |
| `entries` | string[] | **Yes** | Description text. Array of paragraphs. |

### Activity (Action Cost)

```json
{ "unit": "action", "number": 2 }
```

| `unit` | `number` | Renders As |
|--------|----------|------------|
| `"action"` | 1 | ◆ |
| `"action"` or `"actions"` | 2 | ◆◆ |
| `"action"` or `"actions"` | 3 | ◆◆◆ |
| `"free"` | *(ignored)* | ◇ |
| `"reaction"` | *(ignored)* | ◈ |

---

## Validation Rules

The importer validates:
- `name`: Required, max 100 characters.
- `hp`: Must be a number >= 1.
- `ac`: Must be a number 0-99.
- `rawMarkdown`: If provided, max 50,000 characters.

All other fields are optional and will use defaults if omitted.

---

## Wrapper Format

The importer also accepts the PF2eTools bulk format:

```json
{
  "creature": [
    { ... creature 1 ... },
    { ... creature 2 ... }
  ]
}
```

When wrapped, only the **first creature** is imported.

---

## Auto-Generated Fields

The importer automatically generates:
- **`rawMarkdown`**: Full stat block markdown generated by `renderPf2eCreatureToMarkdown()`. This is what displays in the app's ContentViewer.
- **`gameSystem`**: Set to `"pf2e"`.
- **`initMod`**: Derived from `perception.std`.
- **Recall Knowledge**: Calculated from creature level + rarity trait + type traits.
- **MAP notation**: Calculated from attack bonus + agile trait on each attack.
