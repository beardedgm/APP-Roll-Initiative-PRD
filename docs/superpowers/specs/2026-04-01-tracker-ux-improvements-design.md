# Tracker UX Improvements — Design Spec

**Date:** 2026-04-01
**Stage:** Refinement
**Scope:** 5 targeted UX improvements to `/tracker` combat tracker page

---

## 1. Damage/Heal Micro-Interaction Polish (Approach A)

**Problem:** The damage/heal input is the #1 most-repeated action in combat. The current "Amt" placeholder is vague, Enter always submits as Damage with no discoverability, and the input is narrow.

**Changes to `CombatantCard.jsx`:**

- **Wider input:** Increase `hp-input` width from current to ~64px, with placeholder `"10"` instead of `"Amt"` (shows expected input type).
- **Enter key behavior:** Track `lastAction` state (defaults to `'damage'`). Enter submits using `lastAction`. Clicking DMG or HEAL sets `lastAction` for that card. This means: first Enter = damage (same as now), but after clicking Heal once, subsequent Enters also heal.
- **Shift+Enter:** Always submits the opposite of `lastAction` (damage↔heal).
- **Visual hint:** Add `title` attribute on input: `"Enter amount, then press Enter or click Dmg/Heal"`.
- **Button labels:** Keep "DMG" and "HEAL" as-is (already clear, well-colored).

**Files:** `CombatantCard.jsx`, `tracker.css` (input width)

---

## 2. Next Turn Keyboard Shortcut

**Problem:** DMs advance turns hundreds of times per session but must mouse to the Next button every time.

**Changes:**

- **Global keydown listener** in `Tracker.jsx` (the page component): listens for `Space` key.
- **Guard:** Only fires when `document.activeElement` is not an `input`, `textarea`, `select`, or `[contenteditable]`. This prevents spacebar from interfering with typing in the HP input, dice count, etc.
- **Action:** Calls `nextTurn()` from `useCombatStore` when `state === 'combat'`.
- **Visual hint:** Update the Next button label in `TurnControls.jsx` to include a small shortcut hint. Render as: `Next ▶` with a `title="Spacebar"` tooltip. Optionally add a `<kbd>Space</kbd>` label styled subtly below the button text.

**Files:** `Tracker.jsx` (keydown listener), `TurnControls.jsx` (hint), `tracker.css` (kbd styling)

---

## 3. Pre-Combat Initiative Display

**Problem:** When all combatants have initiative "0" (pre-combat), the large "0" numbers create visual noise without information value.

**Changes to `CombatantCard.jsx`:**

- Accept a new prop or read `combatState` from the store.
- When `state === 'pre-combat'`: render `"—"` instead of the initiative number, and apply a dimmed class (`combatant-card__initiative--dim`).
- When `state === 'combat'`: render the real initiative number as-is (current behavior).

**CSS:** `.combatant-card__initiative--dim` sets `color: var(--color-text-muted)` and `opacity: 0.5`.

**Files:** `CombatantCard.jsx`, `tracker.css`

---

## 4. Strengthened Active Turn Indicator (Approach C)

**Problem:** The current gold glow on the active combatant is not prominent enough in a 6+ combatant list. DMs need to find the active creature instantly when glancing back.

**Changes to `.combatant-card--active` in `tracker.css`:**

- **Background:** `linear-gradient(135deg, rgba(201,162,103,0.10), rgba(201,162,103,0.04))`
- **Border:** `1px solid rgba(201,162,103,0.35)`
- **Box-shadow:** `0 0 20px rgba(201,162,103,0.12), inset 0 0 30px rgba(201,162,103,0.03)`
- **Initiative number:** When active, apply gold color (`--color-accent-gold`), gold-tinted background (`rgba(201,162,103,0.18)`), and subtle gold border.

**Changes to `CombatantCard.jsx`:**

- When `isActive` is true, render a small `▶` arrow (gold, ~12px) between the initiative number and the combatant name.

**Files:** `CombatantCard.jsx`, `tracker.css`

---

## 5. Muted Text Contrast (WCAG AA)

**Problem:** `--color-text-muted: #838495` has ~4.1:1 contrast ratio against `--color-bg-card: #1a1b24`, which is borderline for WCAG AA body text (requires 4.5:1).

**Change:** Update `--color-text-muted` from `#838495` to `#9a9bac` in `shared.css`.

**Result:** ~5.1:1 contrast ratio. Passes WCAG AA. Subtle enough to still read as "muted" text.

**Files:** `shared.css`

---

## Files Affected (Summary)

| File | Changes |
|------|---------|
| `client/src/components/tracker/CombatantCard.jsx` | Wider HP input, placeholder, Enter/Shift+Enter behavior, lastAction tracking, pre-combat initiative dim, active ▶ arrow |
| `client/src/components/tracker/TurnControls.jsx` | Spacebar hint on Next button |
| `client/src/pages/Tracker.jsx` | Global spacebar keydown listener |
| `client/src/styles/tracker.css` | HP input width, initiative dim class, active card styles (background, border, shadow, initiative gold), kbd hint styling |
| `client/src/styles/shared.css` | Bump `--color-text-muted` to `#9a9bac` |

---

## Out of Scope

- No new components created
- No store changes (all 5 improvements are view-layer only, except the `lastAction` state which is local component state)
- No API changes
- No new dependencies
- Mobile layout: these changes work naturally in the existing responsive stack (single-column on mobile)

---

## Testing

- Manual: verify all 5 changes visually in the browser at desktop and mobile widths
- Verify Enter/Shift+Enter on HP input works correctly
- Verify Spacebar only fires Next Turn when no input is focused
- Verify pre-combat shows "—", combat shows real initiative numbers
- Verify active card is visually distinct in a list of 6+ combatants
- Verify muted text passes WCAG AA contrast check
- Run `npm run lint` to ensure no regressions
- Run `npm run build` (client) to verify production build succeeds
