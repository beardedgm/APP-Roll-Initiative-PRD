# ⚔️ D&D Initiative Tracker

A browser-based initiative tracker for D&D 5e with a full **DM view** and a separate TV-optimised **Player view**. No install, no server, no build step — just open `index.html`.

## Features

### DM View (`index.html`)
- Add **players, monsters, and NPCs** with name, max HP, AC, and initiative modifier
- **Quantity field** — add multiple identical monsters at once (auto-numbered)
- **Start Combat modal** — enter player initiatives manually; monsters auto-roll 1d20 + modifier (with individual reroll buttons)
- **Initiative order** with HP bars, AC display, and status tracking (Normal / Unconscious)
- **Next Turn / Previous Turn** controls with round counter
- **Undo / Redo** for all encounter changes (Ctrl+Z / Ctrl+Y)
- **Named saves** — save and reload encounters by name within the browser
- **Export / Import JSON** — portable encounter files including dice history
- **Reset** — removes monsters and NPCs, keeps player characters
- **Open Player View** — launches the player-facing display in a new window

### Dice Roller
- All standard TTRPG dice: d4, d6, d8, d10, d12, d20, d100
- **Count** field for multi-dice rolls (e.g. 3d6)
- **Advantage / Disadvantage** toggle — rolls two dice, keeps the higher or lower
- **Roll history** (last 12 rolls) with a **↺ re-roll** button on each entry
- History persists across resets and is saved in exported JSON

### Player View (`player.html`)
- TV-optimised full-screen layout — readable from across the room
- Live updates via localStorage polling (no server required)
- Shows initiative order, active-turn highlight, and status badges:
  - **Hurt** — any HP loss above 25%
  - **Bloody** — 25% HP or below
  - **Unconscious** — 0 HP
- Shows a "GM is preparing…" screen during pre-combat setup

## Usage

### Local
Open `index.html` in any modern browser. Click **Player View** to open the player display — both windows share the same `localStorage` origin so they stay in sync automatically.

### GitHub Pages
The site is live at: `https://<username>.github.io/<repo-name>/`

To set up your own hosted copy:
1. Fork or push the repo to GitHub.
2. Go to **Settings → Pages → Source**, select branch `main`, folder `/ (root)`.
3. Save — the site is live within ~60 seconds.

## File Overview

| File | Purpose |
|------|---------|
| `index.html` | DM view markup |
| `dm.js` | DM view logic |
| `dm.css` | DM view styles |
| `player.html` | Player view markup |
| `player.js` | Player view logic (localStorage polling) |
| `player.css` | Player view styles (TV-optimised) |
| `shared.css` | Design tokens, typography, shared components |
| `state.js` | localStorage utilities, schema migration, export/import |

## Tech

Pure HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies beyond [Google Fonts](https://fonts.google.com/) (Cinzel + Crimson Text loaded via CDN).

State is stored in `localStorage` under the key `dnd_initiative_state`. Named saves use `dnd_saved_encounters`.
