# Tracker Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Plus Jakarta Sans app font, DM Show Rolls toggle with player view toasts, a visual save indicator, and a profile panel to the tracker.

**Architecture:** Four independent features touching the tracker UI. The font change is global CSS. Show Rolls adds state to `useCombatStore` and a toast component to the player view. Save indicator replaces the text sync status with a colored icon. Profile panel is a new slide-out component in the tracker header.

**Tech Stack:** React, Zustand, Lucide React, CSS custom properties, Google Fonts, existing API hooks.

**Spec:** `docs/superpowers/specs/2026-04-02-tracker-features-design.md`

---

## File Structure

### New Files
- `client/src/components/tracker/SyncIndicator.jsx` — colored icon showing sync status
- `client/src/components/tracker/ProfilePanel.jsx` — slide-out panel for account management
- `client/src/components/player/PlayerDiceToast.jsx` — dice roll toast overlay for player view

### Modified Files
- `client/src/styles/shared.css` — add Plus Jakarta Sans import and `--font-app` variable
- `client/src/styles/tracker.css` — swap font-family on app containers, add profile panel styles, add player dice toast styles
- `client/src/styles/player.css` — swap font-family on player view containers, add toast styles
- `client/src/store/useCombatStore.js` — add `showRollsToPlayers`, `latestSharedRoll`, `toggleShowRolls()`
- `client/src/components/tracker/DiceRoller.jsx` — add Show Rolls toggle
- `client/src/components/tracker/TrackerHeader.jsx` — replace text sync indicator, add profile button
- `client/src/components/player/PlayerViewLayout.jsx` — render `PlayerDiceToast`
- `client/src/pages/PlayerView.jsx` — pass `latestSharedRoll` to layout
- `client/src/pages/SharedPlayerView.jsx` — pass `latestSharedRoll` from polling data
- `server/models/Encounter.js` — add `latestSharedRoll` field to schema
- `server/validators/encounters.js` — add `latestSharedRoll` to update schema
- `server/routes/encounters.js` — include `latestSharedRoll` in shared endpoint response

---

## Task 1: App Interface Font — Plus Jakarta Sans

**Files:**
- Modify: `client/src/styles/shared.css:6` (font import), `client/src/styles/shared.css:50-51` (add variable)
- Modify: `client/src/styles/tracker.css` (swap font-family on app containers)
- Modify: `client/src/styles/player.css` (swap font-family on player view)

- [ ] **Step 1: Add Plus Jakarta Sans to the Google Fonts import in shared.css**

In `client/src/styles/shared.css`, line 6, replace:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
```

with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```

- [ ] **Step 2: Add `--font-app` CSS variable**

In `client/src/styles/shared.css`, after line 51 (`--font-body: ...`), add:

```css
  --font-app:       'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

- [ ] **Step 3: Update tracker.css to use `--font-app` for app containers**

In `client/src/styles/tracker.css`, find every `font-family: var(--font-heading)` declaration that applies to tracker/app UI elements (NOT marketing). Replace with `font-family: var(--font-app)`.

Key selectors to change:
- `.dm-tracker` root (if it sets font-family)
- `.dm-header`, `.dm-header h1`
- `.panel__title`
- `.dice-result__label`, `.dice-result__total`
- `.dice-history__die`
- `.combatant-card` headings
- `.turn-controls` text
- Any other tracker-specific heading that uses `var(--font-heading)`

Leave any marketing-page selectors using `var(--font-heading)` unchanged.

- [ ] **Step 4: Update player.css to use `--font-app`**

In `client/src/styles/player.css`, replace `font-family: var(--font-heading)` with `font-family: var(--font-app)` on all player view elements:
- `.player-header__title`
- `.player-header__round`
- `.initiative-item__name`
- `.player-footer`
- Any other player view heading that uses `var(--font-heading)`

- [ ] **Step 5: Verify visually**

Run: `npm run dev:client`

Check:
- Tracker page headings use Plus Jakarta Sans (lowercase letters visible in "Initiative Tracker")
- Dice roller shows "d6", "d20" with lowercase "d"
- Marketing/landing page still uses Cinzel headings
- Player view uses Plus Jakarta Sans

- [ ] **Step 6: Commit**

```bash
git add client/src/styles/shared.css client/src/styles/tracker.css client/src/styles/player.css
git commit -m "feat: add Plus Jakarta Sans for app interface, keep Cinzel for marketing"
```

---

## Task 2: Save Indicator — SyncIndicator Component

**Files:**
- Create: `client/src/components/tracker/SyncIndicator.jsx`
- Modify: `client/src/components/tracker/TrackerHeader.jsx`
- Modify: `client/src/styles/tracker.css`

- [ ] **Step 1: Create SyncIndicator component**

Create `client/src/components/tracker/SyncIndicator.jsx`:

```jsx
import { Save } from 'lucide-react';
import useUserDataStore from '../../store/useUserDataStore';
import { useSyncStatus } from '../../hooks/useCloudSync';

/**
 * Visual sync status icon. Shows the worst-case status between
 * user data sync and encounter cloud sync.
 *
 * Green = saved, Grey = saving/pending, Red = error
 */
export default function SyncIndicator() {
  const userDataStatus = useUserDataStore(s => s.syncStatus);
  const encounterStatus = useSyncStatus(s => s.syncStatus);

  // Derive combined status: error > syncing > synced/idle
  let status = 'synced';
  if (userDataStatus === 'error' || encounterStatus === 'error') {
    status = 'error';
  } else if (userDataStatus === 'syncing' || encounterStatus === 'syncing') {
    status = 'syncing';
  } else if (userDataStatus === 'synced' || encounterStatus === 'synced') {
    status = 'synced';
  }
  // idle + idle = synced (both at rest)

  const tooltip = status === 'syncing' ? 'Saving...'
    : status === 'error' ? 'Sync error'
    : 'Saved';

  return (
    <span className={`sync-icon sync-icon--${status}`} title={tooltip}>
      <Save size={16} />
    </span>
  );
}
```

- [ ] **Step 2: Add SyncIndicator styles to tracker.css**

Add to `client/src/styles/tracker.css`:

```css
/* ── Sync Indicator ──────────────────────────────────────── */
.sync-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}
.sync-icon--synced,
.sync-icon--idle {
  color: #4ade80;
}
.sync-icon--syncing {
  color: var(--color-text-secondary);
}
.sync-icon--error {
  color: #f87171;
}
```

- [ ] **Step 3: Replace text sync indicator in TrackerHeader**

In `client/src/components/tracker/TrackerHeader.jsx`:

Replace the import line 4:
```jsx
import useUserDataStore from '../../store/useUserDataStore';
```

with:
```jsx
import SyncIndicator from './SyncIndicator';
```

Remove line 18:
```jsx
const syncStatus = useUserDataStore(s => s.syncStatus);
```

Replace lines 43-50 (the conditional sync status text block):
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

with:
```jsx
        <SyncIndicator />
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`

Check:
- Save icon appears next to undo/redo buttons
- Icon is green when no changes pending
- Make a change (add a combatant) — icon briefly turns grey then back to green
- Tooltip shows "Saved" / "Saving..."

- [ ] **Step 5: Commit**

```bash
git add client/src/components/tracker/SyncIndicator.jsx client/src/components/tracker/TrackerHeader.jsx client/src/styles/tracker.css
git commit -m "feat: replace text sync indicator with colored save icon"
```

---

## Task 3: DM Show Rolls — Store State

**Files:**
- Modify: `client/src/store/useCombatStore.js`

- [ ] **Step 1: Add `showRollsToPlayers` and `latestSharedRoll` to store state**

In `client/src/store/useCombatStore.js`, inside `getDefaultState()` (after line 19 `shareCode: null`), add:

```javascript
    showRollsToPlayers: false,
```

- [ ] **Step 2: Add `toggleShowRolls` action**

After the `clearDiceHistory()` action (line 195), add:

```javascript
      toggleShowRolls() {
        set(s => ({ showRollsToPlayers: !s.showRollsToPlayers }));
      },
```

- [ ] **Step 3: Add transient `latestSharedRoll` state**

After the `redoStack: []` line (line 35), add:

```javascript
      latestSharedRoll: null, // { id, label, total, rolls, sides, modifier, advantage, timestamp }
```

- [ ] **Step 4: Modify `rollDice()` to set `latestSharedRoll` when toggle is on**

In `rollDice()`, after the entry is created (after line 191 `total,`), before the `set()` call, add a label computation and modify the set call.

Replace the existing `set()` call in `rollDice()` (lines 192-193):

```javascript
        set(s => {
          const diceHistory = [entry, ...(s.diceHistory || [])];
          if (diceHistory.length > MAX_DICE_HISTORY) diceHistory.length = MAX_DICE_HISTORY;
          return { diceHistory };
        });
```

with:

```javascript
        // Build label for display
        const countStr = advantage !== 'normal' ? '1' : `${count}`;
        const advStr = advantage === 'advantage' ? ' Adv' : advantage === 'disadvantage' ? ' Dis' : '';
        const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '+0';
        const label = `${countStr}d${sides}${advStr}${modStr}`;

        set(s => {
          const diceHistory = [entry, ...(s.diceHistory || [])];
          if (diceHistory.length > MAX_DICE_HISTORY) diceHistory.length = MAX_DICE_HISTORY;
          const updates = { diceHistory };
          if (s.showRollsToPlayers) {
            updates.latestSharedRoll = { ...entry, label, timestamp: Date.now() };
          }
          return updates;
        });
```

- [ ] **Step 5: Clear `latestSharedRoll` and `showRollsToPlayers` on reset**

In `resetEncounter()`, add to the `set()` call (after `redoStack: []`):

```javascript
          showRollsToPlayers: false,
          latestSharedRoll: null,
```

- [ ] **Step 6: Add `showRollsToPlayers` to `partialize` (persist it)**

In the `partialize` config (around line 197), add after `shareCode: state.shareCode,`:

```javascript
          showRollsToPlayers: state.showRollsToPlayers,
```

Note: Do NOT persist `latestSharedRoll` — stale rolls would trigger phantom toasts on reload.

- [ ] **Step 7: Add both fields to BroadcastChannel sync**

In the BroadcastChannel subscriber (around line 222), add to the `channel.postMessage()` object after `shareCode: state.shareCode,`:

```javascript
      showRollsToPlayers: state.showRollsToPlayers,
      latestSharedRoll: state.latestSharedRoll,
```

- [ ] **Step 8: Commit**

```bash
git add client/src/store/useCombatStore.js
git commit -m "feat: add showRollsToPlayers toggle and latestSharedRoll to combat store"
```

---

## Task 4: DM Show Rolls — Toggle in DiceRoller

**Files:**
- Modify: `client/src/components/tracker/DiceRoller.jsx`
- Modify: `client/src/styles/tracker.css`

- [ ] **Step 1: Add toggle to DiceRoller component**

In `client/src/components/tracker/DiceRoller.jsx`, add store selectors after line 54:

```jsx
  const showRollsToPlayers = useCombatStore(s => s.showRollsToPlayers);
  const toggleShowRolls = useCombatStore(s => s.toggleShowRolls);
```

- [ ] **Step 2: Add toggle UI to the panel header**

Replace line 85:
```jsx
      <h2 className="panel__title"><Dices size={18} /> Dice Roller</h2>
```

with:
```jsx
      <div className="panel__title-row">
        <h2 className="panel__title"><Dices size={18} /> Dice Roller</h2>
        <label className="show-rolls-toggle" title="Broadcast dice rolls to the player view">
          <span className="show-rolls-toggle__label">Show Rolls</span>
          <button
            type="button"
            role="switch"
            aria-checked={showRollsToPlayers}
            className={`show-rolls-toggle__switch${showRollsToPlayers ? ' show-rolls-toggle__switch--on' : ''}`}
            onClick={toggleShowRolls}
          >
            <span className="show-rolls-toggle__knob" />
          </button>
        </label>
      </div>
```

- [ ] **Step 3: Add toggle styles to tracker.css**

Add to `client/src/styles/tracker.css`:

```css
/* ── Show Rolls Toggle ───────────────────────────────────── */
.panel__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.show-rolls-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.show-rolls-toggle__label {
  font-family: var(--font-app);
  font-size: 12px;
  color: var(--color-text-secondary);
}
.show-rolls-toggle__switch {
  width: 36px;
  height: 20px;
  background: var(--color-border-light);
  border: none;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background var(--transition-fast);
  padding: 0;
}
.show-rolls-toggle__switch--on {
  background: var(--color-accent-gold);
}
.show-rolls-toggle__knob {
  display: block;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left var(--transition-fast);
}
.show-rolls-toggle__switch--on .show-rolls-toggle__knob {
  left: 18px;
}
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev:client`

Check:
- Toggle appears in DiceRoller panel header
- Clicking toggles on/off with gold highlight
- Toggle state persists on page refresh

- [ ] **Step 5: Commit**

```bash
git add client/src/components/tracker/DiceRoller.jsx client/src/styles/tracker.css
git commit -m "feat: add Show Rolls toggle to DiceRoller panel"
```

---

## Task 5: DM Show Rolls — Player View Toast

**Files:**
- Create: `client/src/components/player/PlayerDiceToast.jsx`
- Modify: `client/src/components/player/PlayerViewLayout.jsx`
- Modify: `client/src/pages/PlayerView.jsx`
- Modify: `client/src/pages/SharedPlayerView.jsx`
- Modify: `client/src/styles/player.css`

- [ ] **Step 1: Create PlayerDiceToast component**

Create `client/src/components/player/PlayerDiceToast.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';

function getNatClass(entry) {
  if (!entry || entry.sides !== 20) return '';
  if (entry.rolls.some(r => r === 20)) return 'player-dice-toast--nat20';
  if (entry.rolls.some(r => r === 1)) return 'player-dice-toast--nat1';
  return '';
}

function Breakdown({ entry }) {
  const { rolls, modifier, advantage } = entry;

  if (advantage !== 'normal') {
    const used = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const parts = rolls.map((r, i) => (
      r === used
        ? <b key={`r${i}`}>{r}</b>
        : <s key={`r${i}`} style={{ opacity: 0.5 }}>{r}</s>
    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], []);
    return <span className="player-dice-toast__breakdown">({parts}, <span className="player-dice-toast__mod">{modifier}</span>)</span>;
  }

  const parts = rolls.map((r, i) => (i === 0 ? String(r) : `, ${r}`));
  return <span className="player-dice-toast__breakdown">({parts}, <span className="player-dice-toast__mod">{modifier}</span>)</span>;
}

export default function PlayerDiceToast({ latestSharedRoll }) {
  const [visible, setVisible] = useState(false);
  const [roll, setRoll] = useState(null);
  const lastTimestampRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!latestSharedRoll || latestSharedRoll.timestamp === lastTimestampRef.current) return;

    lastTimestampRef.current = latestSharedRoll.timestamp;
    setRoll(latestSharedRoll);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 6000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [latestSharedRoll]);

  if (!roll || !visible) return null;

  return (
    <div className={`player-dice-toast ${getNatClass(roll)}`} key={roll.timestamp}>
      <span className="player-dice-toast__label">{roll.label}</span>
      <span className="player-dice-toast__total">{roll.total}</span>
      <Breakdown entry={roll} />
      <div className="player-dice-toast__timer" />
    </div>
  );
}
```

- [ ] **Step 2: Add toast styles to player.css**

Add to `client/src/styles/player.css`:

```css
/* ── Player Dice Toast ───────────────────────────────────── */
.player-dice-toast {
  position: fixed;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-card);
  border: 1px solid var(--color-accent-gold);
  border-radius: var(--radius-lg);
  padding: 14px 28px;
  text-align: center;
  animation: player-toast-slide-up 300ms ease-out;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  font-family: var(--font-app);
}
.player-dice-toast--nat20 {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}
.player-dice-toast--nat1 {
  border-color: var(--color-accent-red);
  box-shadow: 0 0 20px rgba(229, 72, 77, 0.3);
}
.player-dice-toast__label {
  display: block;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.player-dice-toast__total {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.player-dice-toast--nat20 .player-dice-toast__total {
  color: #ffd700;
}
.player-dice-toast--nat1 .player-dice-toast__total {
  color: var(--color-accent-red);
}
.player-dice-toast__breakdown {
  display: block;
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
.player-dice-toast__mod {
  color: var(--color-text-secondary);
}
.player-dice-toast__timer {
  height: 2px;
  background: var(--color-accent-gold);
  border-radius: 1px;
  margin-top: 10px;
  animation: player-toast-shrink 6s linear forwards;
}
@keyframes player-toast-slide-up {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes player-toast-shrink {
  from { width: 100%; }
  to { width: 0%; }
}
```

- [ ] **Step 3: Pass `latestSharedRoll` in PlayerView.jsx**

In `client/src/pages/PlayerView.jsx`, add a selector after line 8:

```jsx
  const latestSharedRoll = useCombatStore(s => s.latestSharedRoll);
```

Add the prop to the `PlayerViewLayout` component (after `isLoading={false}`):

```jsx
      latestSharedRoll={latestSharedRoll}
```

- [ ] **Step 4: Pass `latestSharedRoll` in SharedPlayerView.jsx**

In `client/src/pages/SharedPlayerView.jsx`, the encounter data comes from the polling API. Add the prop to `PlayerViewLayout`:

```jsx
      latestSharedRoll={encounter?.latestSharedRoll}
```

- [ ] **Step 5: Render PlayerDiceToast in PlayerViewLayout**

In `client/src/components/player/PlayerViewLayout.jsx`:

Add import after line 4:
```jsx
import PlayerDiceToast from './PlayerDiceToast';
```

Add `latestSharedRoll` to the destructured props (line 8):
```jsx
export default function PlayerViewLayout({
  encounter,
  isLoading,
  error,
  errorMessage,
  showShareInfo,
  latestSharedRoll,
}) {
```

In the active combat return (the last return block, around line 138), add `<PlayerDiceToast>` just before the closing `</div>` of `player-wrapper`:

```jsx
      <PlayerDiceToast latestSharedRoll={latestSharedRoll} />
    </div>
```

Also add it to the pre-combat PC list return (around line 94) in the same position — before closing `</div>` of `player-wrapper`:

```jsx
      <PlayerDiceToast latestSharedRoll={latestSharedRoll} />
    </div>
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/player/PlayerDiceToast.jsx client/src/components/player/PlayerViewLayout.jsx client/src/pages/PlayerView.jsx client/src/pages/SharedPlayerView.jsx client/src/styles/player.css
git commit -m "feat: add dice roll toast overlay to player view"
```

---

## Task 6: DM Show Rolls — Server Support for Shared Player View

**Files:**
- Modify: `server/models/Encounter.js`
- Modify: `server/validators/encounters.js`
- Modify: `server/routes/encounters.js`

- [ ] **Step 1: Add `latestSharedRoll` to Encounter schema**

In `server/models/Encounter.js`, after line 37 (`diceHistory: [DiceHistoryEntrySchema],`), add:

```javascript
  latestSharedRoll: { type: mongoose.Schema.Types.Mixed, default: null },
```

- [ ] **Step 2: Add `latestSharedRoll` to update validator**

In `server/validators/encounters.js`, define a shared roll schema before the exports:

```javascript
const latestSharedRollSchema = z.object({
  id: z.string(),
  label: z.string(),
  sides: z.number().int().positive(),
  count: z.number().int().positive(),
  modifier: z.number().int(),
  advantage: z.enum(['normal', 'advantage', 'disadvantage']),
  rolls: z.array(z.number().int()).max(20),
  total: z.number().int(),
  timestamp: z.number(),
}).nullable();
```

Add to `updateEncounterSchema` (after `diceHistory`):

```javascript
  latestSharedRoll: latestSharedRollSchema.optional(),
```

Also add to `createEncounterSchema` (after `diceHistory`):

```javascript
  latestSharedRoll: latestSharedRollSchema.optional().default(null),
```

- [ ] **Step 3: Include `latestSharedRoll` in shared endpoint response**

In `server/routes/encounters.js`, line 146, add `latestSharedRoll` to the `.select()`:

Replace:
```javascript
    .select('name state currentRound activeCreatureId combatants updatedAt')
```

with:
```javascript
    .select('name state currentRound activeCreatureId combatants latestSharedRoll updatedAt')
```

In the response object (line 175), add `latestSharedRoll` so it's included:

Replace:
```javascript
  res.json({
    encounter: {
      ...encounter,
      combatants: safeCombatants,
    },
  });
```

with:
```javascript
  res.json({
    encounter: {
      ...encounter,
      combatants: safeCombatants,
      latestSharedRoll: encounter.latestSharedRoll || null,
    },
  });
```

- [ ] **Step 4: Verify end-to-end**

Run: `npm run dev`

Test flow:
1. Open tracker, enable "Show Rolls" toggle
2. Open player view (`/play`) in a second tab
3. Roll dice in the tracker
4. Confirm toast appears in the player view tab
5. Confirm toast auto-dismisses after 6 seconds
6. Roll a d20 that hits nat 20 — confirm gold styling

- [ ] **Step 5: Commit**

```bash
git add server/models/Encounter.js server/validators/encounters.js server/routes/encounters.js
git commit -m "feat: add latestSharedRoll to encounter model and shared endpoint"
```

---

## Task 7: Profile Panel

**Files:**
- Create: `client/src/components/tracker/ProfilePanel.jsx`
- Modify: `client/src/components/tracker/TrackerHeader.jsx`
- Modify: `client/src/styles/tracker.css`

- [ ] **Step 1: Create ProfilePanel component**

Create `client/src/components/tracker/ProfilePanel.jsx`:

```jsx
import { useState } from 'react';
import { X, ExternalLink, LogOut } from 'lucide-react';
import { useCurrentUser, useLogout } from '../../api/useAuth';
import { useUpdateProfile, useChangePassword } from '../../api/useAuth';
import { useNavigate } from 'react-router-dom';

export default function ProfilePanel({ open, onClose }) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);

  function handleEditName() {
    setNameValue(user?.displayName || '');
    setEditingName(true);
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return;
    await updateProfile.mutateAsync({ displayName: nameValue.trim() });
    setEditingName(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ type: 'success', text: 'Password updated' });
      setCurrentPw('');
      setNewPw('');
    } catch {
      setPwMsg({ type: 'error', text: 'Failed to update password' });
    }
  }

  async function handleLogout() {
    onClose();
    await logout.mutateAsync();
    navigate('/');
  }

  if (!open) return null;

  return (
    <>
      <div className="profile-backdrop" onClick={onClose} />
      <aside className="profile-panel">
        <div className="profile-panel__header">
          <h2>Profile</h2>
          <button className="btn btn--icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="profile-panel__section">
          <label className="profile-panel__label">Display Name</label>
          {editingName ? (
            <div className="profile-panel__edit-row">
              <input
                type="text"
                className="profile-panel__input"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                autoFocus
                maxLength={50}
              />
              <button className="btn btn--sm btn--primary" onClick={handleSaveName} disabled={updateProfile.isPending}>
                Save
              </button>
              <button className="btn btn--sm" onClick={() => setEditingName(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="profile-panel__edit-row">
              <span className="profile-panel__value">{user?.displayName || user?.email?.split('@')[0] || '—'}</span>
              <button className="btn btn--sm" onClick={handleEditName}>Edit</button>
            </div>
          )}
        </div>

        <div className="profile-panel__section">
          <label className="profile-panel__label">Email</label>
          <span className="profile-panel__value">{user?.email || '—'}</span>
        </div>

        <div className="profile-panel__section">
          <label className="profile-panel__label">Change Password</label>
          <form onSubmit={handleChangePassword} className="profile-panel__pw-form">
            <input
              type="password"
              className="profile-panel__input"
              placeholder="Current password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              required
            />
            <input
              type="password"
              className="profile-panel__input"
              placeholder="New password (min 8 chars)"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              minLength={8}
            />
            <button className="btn btn--sm btn--primary" type="submit" disabled={changePassword.isPending}>
              Update Password
            </button>
            {pwMsg && (
              <span className={`profile-panel__msg profile-panel__msg--${pwMsg.type}`}>
                {pwMsg.text}
              </span>
            )}
          </form>
        </div>

        <div className="profile-panel__section">
          <button className="btn btn--sm" onClick={() => { onClose(); navigate('/settings'); }}>
            <ExternalLink size={14} /> Full Settings
          </button>
        </div>

        <div className="profile-panel__footer">
          <button className="btn btn--danger btn--sm" onClick={handleLogout}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Add profile panel styles to tracker.css**

Add to `client/src/styles/tracker.css`:

```css
/* ── Profile Panel ───────────────────────────────────────── */
.profile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 900;
}
.profile-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  max-width: 90vw;
  height: 100vh;
  background: var(--color-bg-mid);
  border-left: 1px solid var(--color-border-light);
  z-index: 901;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 4px;
  overflow-y: auto;
  animation: profile-slide-in 200ms ease-out;
  font-family: var(--font-app);
}
@keyframes profile-slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.profile-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.profile-panel__header h2 {
  font-family: var(--font-app);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.profile-panel__section {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}
.profile-panel__label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.profile-panel__value {
  color: var(--color-text-primary);
  font-size: 14px;
}
.profile-panel__edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.profile-panel__input {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: var(--font-app);
  width: 100%;
}
.profile-panel__pw-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.profile-panel__msg {
  font-size: 12px;
}
.profile-panel__msg--success {
  color: var(--color-accent-green);
}
.profile-panel__msg--error {
  color: var(--color-accent-red);
}
.profile-panel__footer {
  margin-top: auto;
  padding-top: 16px;
}
```

- [ ] **Step 3: Add profile button and panel to TrackerHeader**

In `client/src/components/tracker/TrackerHeader.jsx`:

Add imports at the top:
```jsx
import { Swords, Undo2, Redo2, Monitor, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '../../api/useAuth';
import ProfilePanel from './ProfilePanel';
```

Inside the component, add state and user query:
```jsx
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Account';
```

After the Reset button (before the closing `</div>` of `dm-header__right`), add:

```jsx
        {user && (
          <>
            <span className="header-divider" />
            <button className="btn btn--icon" onClick={() => setProfileOpen(true)} title="Profile">
              <User size={16} /> {displayName}
            </button>
          </>
        )}
```

After the closing `</header>` tag, add:

```jsx
      {user && <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />}
```

Note: The component now needs to return a fragment wrapping `<header>` and `<ProfilePanel>`. Wrap the return in `<>...</>`.

- [ ] **Step 4: Handle Escape key to close profile panel**

In `ProfilePanel.jsx`, add an effect at the top of the component (after the state declarations):

```jsx
  // Close on Escape
  import { useEffect } from 'react'; // add to existing import

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);
```

(Note: merge `useEffect` into the existing `useState` import from React on line 1.)

- [ ] **Step 5: Verify visually**

Run: `npm run dev`

Check:
- Profile button appears in TrackerHeader with user's display name
- Clicking opens slide-out panel from the right
- Backdrop click closes it
- Escape key closes it
- Display name editing works
- Password change works
- "Full Settings" navigates to /settings
- "Log Out" logs out and redirects

- [ ] **Step 6: Commit**

```bash
git add client/src/components/tracker/ProfilePanel.jsx client/src/components/tracker/TrackerHeader.jsx client/src/styles/tracker.css
git commit -m "feat: add profile panel slide-out to tracker header"
```

---

## Task 8: Lint and Final Verification

**Files:** All modified files

- [ ] **Step 1: Run client lint**

```bash
cd client && npm run lint
```

Expected: 0 errors. Fix any issues.

- [ ] **Step 2: Run client build**

```bash
cd client && npx vite build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run server lint**

```bash
cd server && npx eslint .
```

Expected: 0 errors. Fix any issues.

- [ ] **Step 4: End-to-end verification**

Run: `npm run dev`

Full test checklist:
- [ ] Tracker headings use Plus Jakarta Sans (not Cinzel)
- [ ] Marketing pages still use Cinzel
- [ ] Dice notation shows lowercase "d" (e.g., "2d6+5")
- [ ] Save icon shows green when synced
- [ ] Save icon shows grey briefly when making changes
- [ ] Show Rolls toggle works in DiceRoller panel
- [ ] Player view toast appears when Show Rolls is on and dice are rolled
- [ ] Toast auto-dismisses after 6 seconds
- [ ] Nat 20/Nat 1 styling works on player toast
- [ ] Profile button opens slide-out panel
- [ ] Display name edit works
- [ ] Password change works
- [ ] Panel closes on backdrop click and Escape

- [ ] **Step 5: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "fix: lint and build fixes"
```
