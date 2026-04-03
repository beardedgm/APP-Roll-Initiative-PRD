# Layout Restructure: Left = Library, Right = Content Viewer

**Date:** 2026-04-03
**Status:** Draft
**Sub-project:** 1 of 3 (Spells feature foundation)

---

## Overview

Restructure the tracker's three-panel layout to cleanly separate navigation (left) from content display (right). This sets the foundation for adding spells — and any future content type — without overloading the left panel.

**Current:** Left panel shows creature lists AND stat block detail views. Right side is only a dice roller. Viewing a stat block takes over the entire left panel, hiding the creature list.

**After:** Left panel is pure library/navigation (creature list, spell list, characters, encounters). Right panel is a content viewer (stat blocks, spell descriptions) with a collapsible dice roller. The creature list stays visible while you read a stat block.

---

## 1. Left Panel — Library/Navigation

### Tab Structure

Replace `5E | PF2E | Characters | Encounters` with:

```
Creatures | Spells | Characters | Encounters
```

The Creatures and Spells tabs each have an internal system toggle (segmented control): `[5E] [PF2E]`.

Characters and Encounters tabs are unchanged — no system toggle.

### System Toggle

- Small segmented control below the tab bar, inside the tab content area.
- Two buttons: `5E` and `PF2E`. Active button uses gold accent background.
- Switching the toggle changes which data set is searched/displayed.
- Toggle state is per-tab (Creatures and Spells track their system independently).

### Creatures Tab

- Same search, filter, and pagination as current MonsterDatabase — but **list view only**.
- Clicking a creature name sends it to the right panel content viewer (instead of showing a detail view inline).
- The selected creature is highlighted in the list.
- Source filter and CR/Level filter remain.
- Custom monsters still appear with edit/delete controls.
- "Add to Encounter" button stays on each list item.

### Spells Tab

- Placeholder for this sub-project. Shows: "Spells coming soon" centered message.
- Has the system toggle (5E / PF2E) wired up even though there's no data yet. This validates the toggle pattern works before sub-project 2 adds real data.

### Characters & Encounters Tabs

- No changes. Same components as today.

### showStatBlock / showSpell Imperative Methods

The LeftPanel still exposes `showStatBlock(slug)` via `useImperativeHandle`. When called:
1. Switches to the Creatures tab.
2. Sets the system toggle to the correct system (based on `pf2e_` slug prefix).
3. Selects the creature in the list.
4. Sends the creature to the right panel content viewer.

A new `showSpell(slug)` method will be added in sub-project 2 when spell data exists. For now, it's not needed.

---

## 2. Right Panel — Content Viewer

### Structure

The right panel has two sections stacked vertically:

1. **Dice Roller** (top) — collapsible, collapsed by default.
2. **Content Viewer** (below) — displays stat blocks, spell descriptions, or an empty state.

### Dice Roller (Collapsible)

- **Collapsed state (default):** A single row showing:
  - Dice icon + "Dice Roller" label (left)
  - Last roll summary, e.g., "Last: 2d6+5 = 14" (center/right)
  - Chevron toggle (right)
  - Clicking anywhere on the row expands it.
- **Expanded state:** The full dice roller UI as it exists today — die buttons, count, modifier, advantage toggle, result display, history.
- **Persistence:** Collapsed/expanded state saved to localStorage so it remembers across page loads.
- **Functionality:** Identical in both states. Rolling from stat blocks or spells still works regardless of collapsed/expanded state. The dice toast still appears.

### Content Viewer

- **Empty state:** When nothing is selected, shows a centered message: "Select a creature or spell to view details" with a subtle icon.
- **Stat block view:** When a creature is selected from the left panel (or from clicking a combatant name in the tracker), the full stat block renders here. Same markdown rendering, same DOMPurify sanitization, same clickable dice notation.
- **Spell view:** When a spell link is clicked in a stat block (or a spell is selected from the Spells tab in sub-project 2), the spell description renders here.
- **Back navigation:** When viewing a spell that was opened from a stat block, a breadcrumb appears at the top: "← Back to [Creature Name]". Clicking it returns to the stat block. This is a simple content stack — not full routing.

### Content Stack

The right panel maintains a small navigation stack:
- Viewing a creature → stack is `[creature]`
- Clicking a spell in that creature → stack is `[creature, spell]`, breadcrumb shows "← Back to Redcap"
- Clicking back → stack is `[creature]`, stat block restored
- Selecting a different creature from the left panel → stack resets to `[newCreature]`
- Selecting a spell from the Spells tab → stack is `[spell]`, no breadcrumb

This is NOT React Router. It's local component state — an array of `{ type: 'creature' | 'spell', slug, name }` objects. Push on navigate, pop on back. The content viewer fetches the full data (markdown, metadata) from the API based on the slug — the stack only stores the reference, not the content.

### Resizable

- Right panel has a drag handle on its left edge (same pattern as the left panel's right edge).
- Width persists to localStorage.
- Default width: 340px. Min width: 280px.

---

## 3. Center Panel — Tracker

### No Functional Changes

The initiative list, turn controls, header (undo/redo, save indicator, profile) — all unchanged. The center panel is the flexible element that takes remaining space between left and right panels.

### Combatant Name Click

Currently, clicking a combatant name with a `monsterSlug` calls `leftPanelRef.showStatBlock(slug)`. After the restructure, this still works — `showStatBlock` selects the creature in the left panel AND sends it to the right panel content viewer. The only difference is where the stat block appears (right panel instead of left panel).

---

## 4. State Management

### New: useUIStore Additions

Add to the existing `useUIStore` (or create a new `useContentViewerStore`):

```
contentStack: []          // Array of { type: 'creature'|'spell', slug, name }
selectedCreatureSlug: null // Currently highlighted creature in left panel list
selectedSpellSlug: null    // Currently highlighted spell in left panel list
diceRollerExpanded: false  // Collapsed/expanded state (persisted to localStorage)
creaturesSystem: '5e'     // Active system toggle for Creatures tab
spellsSystem: '5e'        // Active system toggle for Spells tab
```

### MonsterDatabase Refactor

The current `MonsterDatabase` component handles both the list view AND the detail view (stat block). It needs to be split:

- **CreatureList** — the search/filter/paginated list. Lives in the left panel. When a creature is clicked, it pushes to the content stack.
- **ContentViewer** — the stat block / spell renderer. Lives in the right panel. Reads from the content stack.

The `makeDiceClickable` function and markdown rendering logic move to `ContentViewer` since that's where stat blocks render now.

### Existing State Preserved

- `useCombatStore` — unchanged. Combat state, dice history, all the same.
- `useUserDataStore` — unchanged. Characters, custom monsters, encounter presets.
- Panel widths — both left and right save to localStorage (separate keys).

---

## 5. Spell Link Detection (Foundation Only)

This sub-project does NOT implement spell linking. But the content viewer should be architecturally ready for it:

- The `ContentViewer` component accepts an `onSpellClick(spellName)` callback.
- When sub-project 3 adds spell interactivity, it will wire this callback to look up the spell and push it to the content stack.
- For now, spell names in stat blocks are NOT interactive. They render as plain text.

---

## 6. Files to Create/Modify

### New Files
- `client/src/components/tracker/ContentViewer.jsx` — right panel content viewer (stat blocks + future spells)
- `client/src/components/tracker/CreatureList.jsx` — extracted list-only view from MonsterDatabase
- `client/src/components/tracker/SystemToggle.jsx` — reusable 5E/PF2E segmented control
- `client/src/components/tracker/RightPanel.jsx` — right panel container (dice roller + content viewer)

### Modified Files
- `client/src/components/tracker/LeftPanel.jsx` — new tab structure, system toggles, list-only rendering
- `client/src/components/tracker/MonsterDatabase.jsx` — extract list logic to CreatureList, detail logic to ContentViewer
- `client/src/components/tracker/DiceRoller.jsx` — add collapsible wrapper
- `client/src/pages/Tracker.jsx` — three-panel layout with both resize handles
- `client/src/store/useUIStore.js` — add content stack, system toggles, dice roller state
- `client/src/styles/tracker.css` — right panel styles, system toggle styles, collapsible dice roller styles, content viewer styles

### Removed (Merged Into Other Components)
- The stat block detail view currently inside MonsterDatabase gets extracted to ContentViewer. MonsterDatabase itself may be replaced entirely by CreatureList or kept as a thin wrapper.

---

## 7. Behavioral Details

### Panel Resize

- Both panels use the same drag-handle pattern.
- Left panel: drag handle on right edge (already exists).
- Right panel: drag handle on left edge (new).
- Both widths persist to localStorage with separate keys (`tracker-left-width`, `tracker-right-width`).
- Center panel (tracker) is `flex: 1` and takes remaining space.
- Minimum widths: left 260px, right 280px. Center has no explicit minimum but content should remain usable.

### Dice Roller Collapse State

- Clicking the collapsed bar toggles to expanded.
- Clicking a collapse button in the expanded header toggles to collapsed.
- State persists to localStorage key `dice-roller-expanded`.
- Default: collapsed (`false`).
- Rolling dice from a stat block or spell works regardless of collapse state — the roll still happens in `useCombatStore`, the dice toast still appears.

### Content Viewer Empty State

- On initial load: shows "Select a creature or spell to view details."
- When a creature is deselected (e.g., navigating away from Creatures tab): content persists. The viewer keeps showing the last thing you looked at until you explicitly select something new. This is intentional — you might switch to the Encounters tab to load a preset but still want the stat block visible.

### Mobile / Narrow Viewports

- The tracker already has responsive breakpoints. On narrow screens, the three-panel layout should collapse to a single-panel view with navigation.
- For this sub-project: maintain existing responsive behavior. The right panel can be hidden on mobile with a toggle button to show it.
- Detailed mobile design deferred — the tracker is primarily a desktop/tablet tool (DM screen).

---

## 8. What This Does NOT Include

- Spell data (model, seeding, API) — sub-project 2
- Spell interactivity (detecting spell names, making them clickable) — sub-project 3
- PF2e spell conversion — sub-project 2
- SpellDatabase/SpellList component — sub-project 2 (replaces the placeholder)
