# Tracker Features: Show Rolls, Save Indicator, Profile Panel, App Font

**Date:** 2026-04-02
**Status:** Draft

---

## Overview

Four changes to the tracker interface:

1. **App Interface Font** — Switch from Cinzel to Plus Jakarta Sans for all app pages
2. **DM Show Rolls** — Toggle in DiceRoller to broadcast roll results to the player view as 6-second toasts
3. **Save Indicator** — Visual sync status icon in TrackerHeader replacing the text indicator
4. **Profile Panel** — Slide-out panel accessible from TrackerHeader for quick account management

---

## 1. App Interface Font Update

### Problem

Cinzel is an all-caps display font — it lacks lowercase letters. Dice notation like "2d6+5" renders as "2D6+5", which is unnatural for tabletop players. Cinzel also feels heavy for a SaaS tool interface.

### Solution

Dual-font strategy:

- **Marketing pages** (Landing, Features, Pricing, login/register flows): Keep `Cinzel` for headings, `Inter` for body — unchanged.
- **App pages** (Tracker, Dashboard, Settings, Profile, Player View): Use `Plus Jakarta Sans` for both headings and body text.

### Implementation

- Add `Plus Jakarta Sans` (weights 400, 500, 600, 700) via Google Fonts import.
- Add CSS variable `--font-app: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- App page root containers (`.dm-tracker`, `.player-view`, `.dashboard`, `.settings-page`, `.profile-page`) set `font-family: var(--font-app)`.
- Marketing pages continue using `var(--font-heading)` (Cinzel) and `var(--font-body)` (Inter).
- Dice notation, HP numbers, initiative values all inherit Plus Jakarta Sans — no special font overrides needed.

### Scope

- `client/src/styles/shared.css` — add variable and font import
- `client/src/styles/tracker.css` — swap `var(--font-heading)` to `var(--font-app)` on app containers
- `client/src/styles/player.css` — same swap
- `client/index.html` — add Google Fonts preconnect/link for Plus Jakarta Sans
- Marketing CSS (`marketing.css`) — no changes

---

## 2. DM Show Rolls

### Problem

Players watching the player view have no visibility into DM dice rolls. The DM may want to share roll results in real-time for dramatic effect or transparency.

### Solution

A toggle in the DiceRoller panel header that, when enabled, broadcasts all dice roll results to the player view as animated toasts.

### Toggle UI

- **Location:** DiceRoller panel header, right side, next to the panel title.
- **Appearance:** Small toggle switch with "Show Rolls" label.
- **Default:** OFF.
- **Persistence:** Stored in `useCombatStore` state (persisted to localStorage). Resets on encounter reset.

### What gets broadcast

When the toggle is ON, **all** dice rolls broadcast to the player view:
- Dice roller panel rolls
- Clickable stat block dice (from `makeDiceClickable`)
- Initiative rolls (from start combat modal)

### Data flow

1. `useCombatStore.rollDice()` already returns a roll entry. When `showRollsToPlayers` is true, the roll entry is also written to a new `latestSharedRoll` state field (with a timestamp).
2. **Local player view** (`/play`): Reads `latestSharedRoll` via BroadcastChannel, same as other state.
3. **Shared player view** (`/play/:code`): The polling API response includes `latestSharedRoll` when present. The server stores it as part of the encounter's shared state.

### Player view toast

- **Trigger:** When `latestSharedRoll` changes (new timestamp).
- **Content:** Roll label (e.g., "2d6+5"), total, breakdown (e.g., "(4, 5 + 5)").
- **Nat styling:** Nat 20 = gold, Nat 1 = red (same CSS classes as DM dice toast).
- **Position:** Bottom center of the player view, overlaying the initiative list.
- **Animation:** Slides up with fade-in (300ms ease-out entry).
- **Duration:** 6 seconds, with a shrinking progress bar at the bottom of the toast.
- **Dismissal:** Auto-dismiss after 6 seconds. If a new roll arrives, replace immediately (restart timer).
- **Font:** Plus Jakarta Sans.

### State changes

`useCombatStore` additions:
- `showRollsToPlayers: false` (boolean, persisted)
- `latestSharedRoll: null` (object: `{ id, label, total, rolls, sides, modifier, advantage, timestamp }`, persisted)
- `toggleShowRolls()` action
- Modify `rollDice()` to set `latestSharedRoll` when toggle is on
- Modify `resetEncounter()` to clear `showRollsToPlayers` and `latestSharedRoll`

### Shared player view API

The `/api/shared/:code` endpoint already returns encounter state. `latestSharedRoll` will be included in the response when present. The shared player view component checks the timestamp against a local ref to detect new rolls.

### New component

- `client/src/components/player/PlayerDiceToast.jsx` — renders the toast overlay on the player view.
- Used by both `PlayerView.jsx` and `SharedPlayerView.jsx` (via `PlayerViewLayout.jsx`).

---

## 3. Save Indicator

### Problem

The existing sync status is a text label ("Saving...", "Saved", "Sync error") in the TrackerHeader. It's easy to miss and doesn't provide an at-a-glance confidence signal.

### Solution

Replace the text indicator with a visual icon that changes color based on sync status.

### Appearance

- **Location:** TrackerHeader, immediately to the right of the undo/redo buttons.
- **Icon:** Lucide `Save` icon (16px), matching undo/redo button sizing.
- **Colors:**
  - **Grey** (`#888`) — pending changes or actively saving
  - **Green** (`#4ade80`) — all changes synced
  - **Red** (`#f87171`) — sync error
- **Tooltip:** Shows text status on hover ("Saving...", "Saved", "Sync error").

### Behavior

- Pure status indicator — not clickable/actionable.
- Reads `syncStatus` from `useUserDataStore` (same source as the current text indicator).
- Only rendered when the user is authenticated (unauthenticated users have no cloud sync).

### State mapping

| `syncStatus` value | Icon color | Tooltip |
|---|---|---|
| `'idle'` | Green | "Saved" (resting state after sync completes) |
| `'syncing'` | Grey | "Saving..." |
| `'synced'` | Green | "Saved" |
| `'error'` | Red | "Sync error" |

### Changes

- `client/src/components/tracker/TrackerHeader.jsx` — replace text sync indicator with `SyncIndicator` component.
- `client/src/components/tracker/SyncIndicator.jsx` — new small component.
- Remove the existing sync status text rendering from TrackerHeader.

---

## 4. Profile Panel

### Problem

The profile/settings pages are only accessible from the site navbar dropdown, which isn't visible when inside the tracker. Users can't manage their account without navigating away from their combat session.

### Solution

A profile button in the TrackerHeader that opens a slide-out panel within the tracker.

### Access

- **Location:** TrackerHeader, far right (after the divider following Reset).
- **Appearance:** User icon + display name, matching the existing button style.
- **Click:** Opens a slide-out panel from the right edge of the screen.

### Panel contents

1. **Display name** — editable inline (same pattern as Settings page: click to edit, Save/Cancel).
2. **Email** — read-only display.
3. **Change password** — current password + new password fields, Update button.
4. **Settings link** — navigates to `/settings` for subscription management, account deletion.
5. **Logout button** — logs out and redirects to `/`.

### Panel behavior

- Slides in from the right with a semi-transparent backdrop overlay.
- Clicking the backdrop or an X button closes the panel.
- Escape key closes the panel.
- Panel does not unmount the tracker — combat state is preserved.
- Uses the same API hooks as the Settings page (`useUpdateProfile`, `useChangePassword`, `useLogout`).

### New components

- `client/src/components/tracker/ProfilePanel.jsx` — the slide-out panel.
- Triggered from TrackerHeader via local state (`profileOpen` boolean).

### Scope

- `client/src/components/tracker/TrackerHeader.jsx` — add profile button and panel toggle.
- `client/src/components/tracker/ProfilePanel.jsx` — new component.
- `client/src/styles/tracker.css` — styles for profile panel slide-out and backdrop.

---

## Cross-cutting concerns

### BroadcastChannel

The existing BroadcastChannel in `useCombatStore` already broadcasts full state. The new `showRollsToPlayers` and `latestSharedRoll` fields will be included automatically since they're part of the store state.

### localStorage persistence

`showRollsToPlayers` should be included in the persisted state subset in the `partialize` config. `latestSharedRoll` should **not** be persisted — stale rolls from a previous session would trigger phantom toasts on load. It starts as `null` on every page load.

### Player view polling

The shared player view polls `/api/shared/:code` every 2 seconds. `latestSharedRoll` is included in the response. The component uses a ref to track the last-seen timestamp and only triggers a toast on change.

### No new API endpoints

- Show Rolls uses existing state sync mechanisms (BroadcastChannel + shared endpoint).
- Save Indicator reads existing `useUserDataStore.syncStatus`.
- Profile Panel reuses existing auth/profile API hooks.
- No new server routes, models, or validators needed.

### No new dependencies

All features use existing libraries (Lucide icons, Zustand, TanStack Query, existing CSS patterns).
