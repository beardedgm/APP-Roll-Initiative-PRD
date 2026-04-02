# Tracker UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 targeted UX improvements to the `/tracker` combat page, improving the core DM interaction loop.

**Architecture:** All changes are view-layer only — CSS updates and React component modifications. No store, API, or model changes. One new local state variable (`lastAction`) in CombatantCard, one new `useEffect` keydown listener in Tracker.jsx.

**Tech Stack:** React 19, Zustand, CSS custom properties, Vite 7

---

### Task 1: WCAG AA Muted Text Contrast Fix

**Files:**
- Modify: `client/src/styles/shared.css:32`

This is the simplest change and affects the entire app, so do it first.

- [ ] **Step 1: Update the CSS variable**

In `client/src/styles/shared.css`, change the `--color-text-muted` value:

```css
/* Before */
--color-text-muted:     #838495;

/* After */
--color-text-muted:     #9a9bac;
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev:client` (if not already running)

Open `http://localhost:5173/tracker`. Check that muted text (HP labels, empty states, subtitles) is still clearly "muted" but slightly brighter. The change should be subtle but noticeable.

- [ ] **Step 3: Commit**

```bash
git add client/src/styles/shared.css
git commit -m "style: bump muted text color to pass WCAG AA contrast (4.1:1 → 5.1:1)"
```

---

### Task 2: Strengthened Active Turn Indicator

**Files:**
- Modify: `client/src/styles/tracker.css:362-405`
- Modify: `client/src/components/tracker/CombatantCard.jsx:44-61`

- [ ] **Step 1: Update active card CSS**

In `client/src/styles/tracker.css`, replace the `.combatant-card--active` rule (line ~362):

```css
/* Before */
.combatant-card--active {
  background: var(--color-bg-card-hover);
  box-shadow: 0 0 16px rgba(201,162,103,0.3), inset 0 0 0 1px var(--color-accent-gold-dim);
  border-top: 1px solid var(--color-accent-gold-dim);
}

/* After */
.combatant-card--active {
  background: linear-gradient(135deg, rgba(201,162,103,0.10) 0%, rgba(201,162,103,0.04) 100%);
  border: 1px solid rgba(201,162,103,0.35);
  box-shadow: 0 0 20px rgba(201,162,103,0.12), inset 0 0 30px rgba(201,162,103,0.03);
}
```

- [ ] **Step 2: Update active initiative number CSS**

In the same file, replace `.combatant-card--active .combatant-card__initiative` (line ~400):

```css
/* Before */
.combatant-card--active .combatant-card__initiative {
  color: var(--color-accent-gold-hover);
  text-shadow: 0 0 8px rgba(201,162,103,0.6);
  border-color: var(--color-accent-gold-dim);
  box-shadow: var(--glow-gold-sm);
}

/* After */
.combatant-card--active .combatant-card__initiative {
  color: var(--color-accent-gold);
  background: rgba(201,162,103,0.18);
  border-color: rgba(201,162,103,0.25);
  text-shadow: none;
  box-shadow: none;
}
```

- [ ] **Step 3: Add active arrow CSS**

In the same file, add a new rule after the `.combatant-card--active .combatant-card__initiative` block:

```css
.combatant-card__active-arrow {
  color: var(--color-accent-gold);
  font-size: 12px;
  flex-shrink: 0;
  line-height: 1;
}
```

- [ ] **Step 4: Add ▶ arrow to CombatantCard**

In `client/src/components/tracker/CombatantCard.jsx`, inside the `combatant-card__left` div, add the arrow between the initiative span and the info div. Find the existing JSX structure (line ~44):

```jsx
{/* Before */}
<div className="combatant-card__left">
  <span className="combatant-card__initiative">{initDisplay}</span>
  <div className="combatant-card__info">
```

Replace with:

```jsx
{/* After */}
<div className="combatant-card__left">
  <span className="combatant-card__initiative">{initDisplay}</span>
  {isActive && <span className="combatant-card__active-arrow" aria-hidden="true">&#9654;</span>}
  <div className="combatant-card__info">
```

- [ ] **Step 5: Verify visually**

Open the tracker with 3+ combatants, start combat. Verify:
- Active card has gold gradient background, gold border, subtle shadow
- Active initiative number has gold background tint
- Small ▶ arrow appears between initiative number and name on active card only
- Arrow disappears when turn advances to next combatant

- [ ] **Step 6: Commit**

```bash
git add client/src/styles/tracker.css client/src/components/tracker/CombatantCard.jsx
git commit -m "style: strengthen active turn indicator with gold gradient and arrow"
```

---

### Task 3: Pre-Combat Initiative Display

**Files:**
- Modify: `client/src/components/tracker/CombatantCard.jsx:2,6-8`
- Modify: `client/src/styles/tracker.css` (add new class after line ~399)

- [ ] **Step 1: Read combat state in CombatantCard**

In `client/src/components/tracker/CombatantCard.jsx`, add a store subscription. After the existing `applyDamageHeal` line (line ~10):

```jsx
// Before (line 10)
const applyDamageHeal = useCombatStore(s => s.applyDamageHeal);

// After
const applyDamageHeal = useCombatStore(s => s.applyDamageHeal);
const combatState = useCombatStore(s => s.state);
```

- [ ] **Step 2: Conditionally render initiative display**

In the same file, find the initiative display logic (line ~8):

```jsx
// Before
const initDisplay = Number.isInteger(initiative) ? initiative : initiative.toFixed(1);
```

Replace with:

```jsx
// After
const isPreCombat = combatState === 'pre-combat';
const initDisplay = isPreCombat ? '—' : (Number.isInteger(initiative) ? initiative : initiative.toFixed(1));
```

- [ ] **Step 3: Add dim class to initiative element**

In the JSX, update the initiative span:

```jsx
{/* Before */}
<span className="combatant-card__initiative">{initDisplay}</span>

{/* After */}
<span className={`combatant-card__initiative${isPreCombat ? ' combatant-card__initiative--dim' : ''}`}>{initDisplay}</span>
```

- [ ] **Step 4: Add dim CSS**

In `client/src/styles/tracker.css`, after the `.combatant-card__initiative` block (after line ~399, before the active variant), add:

```css
.combatant-card__initiative--dim {
  color: var(--color-text-muted);
  opacity: 0.5;
}
```

- [ ] **Step 5: Verify visually**

- In pre-combat: initiative shows "—" dimmed on all cards
- Start combat and set initiatives: numbers appear at full brightness
- End combat: returns to "—" dimmed state

- [ ] **Step 6: Commit**

```bash
git add client/src/components/tracker/CombatantCard.jsx client/src/styles/tracker.css
git commit -m "feat: dim initiative display in pre-combat state"
```

---

### Task 4: Damage/Heal Micro-Interaction Polish

**Files:**
- Modify: `client/src/components/tracker/CombatantCard.jsx:11-29,80-94`
- Modify: `client/src/styles/tracker.css:517-522`

- [ ] **Step 1: Add lastAction state**

In `client/src/components/tracker/CombatantCard.jsx`, add a new state variable after the existing `inputError` state (line ~12):

```jsx
// Before
const [hpInput, setHpInput] = useState('');
const [inputError, setInputError] = useState(false);
const inputRef = useRef(null);

// After
const [hpInput, setHpInput] = useState('');
const [inputError, setInputError] = useState(false);
const [lastAction, setLastAction] = useState('damage');
const inputRef = useRef(null);
```

- [ ] **Step 2: Update handleAction to track last action**

Replace the existing `handleAction` function:

```jsx
// Before
function handleAction(action) {
  const amount = parseInt(hpInput, 10);
  if (isNaN(amount) || amount <= 0) {
    setInputError(true);
    setTimeout(() => setInputError(false), 600);
    inputRef.current?.focus();
    return;
  }
  applyDamageHeal(id, action, amount);
  setHpInput('');
}

// After
function handleAction(action) {
  const amount = parseInt(hpInput, 10);
  if (isNaN(amount) || amount <= 0) {
    setInputError(true);
    setTimeout(() => setInputError(false), 600);
    inputRef.current?.focus();
    return;
  }
  applyDamageHeal(id, action, amount);
  setLastAction(action);
  setHpInput('');
}
```

- [ ] **Step 3: Update handleKeyDown for Enter/Shift+Enter**

Replace the existing `handleKeyDown` function:

```jsx
// Before
function handleKeyDown(e) {
  if (e.key === 'Enter') handleAction('damage');
}

// After
function handleKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const action = e.shiftKey
      ? (lastAction === 'damage' ? 'heal' : 'damage')
      : lastAction;
    handleAction(action);
  }
}
```

- [ ] **Step 4: Update input element**

In the JSX, update the `hp-input` element's placeholder and title:

```jsx
{/* Before */}
<input
  ref={inputRef}
  type="number"
  className={`hp-input${inputError ? ' input-error' : ''}`}
  placeholder="Amt"
  min={1}
  max={9999}
  value={hpInput}
  onChange={e => setHpInput(e.target.value)}
  onKeyDown={handleKeyDown}
  title="Enter amount then click Dmg or Heal"
/>

{/* After */}
<input
  ref={inputRef}
  type="number"
  className={`hp-input${inputError ? ' input-error' : ''}`}
  placeholder="10"
  min={1}
  max={9999}
  value={hpInput}
  onChange={e => setHpInput(e.target.value)}
  onKeyDown={handleKeyDown}
  title="Enter amount, then press Enter or click Dmg/Heal. Shift+Enter for opposite action."
/>
```

- [ ] **Step 5: Widen the HP input**

In `client/src/styles/tracker.css`, update the `.hp-input` rule:

```css
/* Before */
.hp-input {
  width: 60px;
  padding: 4px 5px;
  font-size: 0.82rem;
  text-align: center;
}

/* After */
.hp-input {
  width: 64px;
  padding: 5px 8px;
  font-size: 0.85rem;
  text-align: center;
}
```

- [ ] **Step 6: Verify**

- Type "8" in HP input, press Enter → applies damage (default)
- Click HEAL button with "5" → heals 5, sets lastAction to heal
- Type "3", press Enter → heals 3 (remembers last action)
- Type "10", press Shift+Enter → damages 10 (opposite of heal)
- Placeholder shows "10" instead of "Amt"
- Input is slightly wider and easier to read

- [ ] **Step 7: Commit**

```bash
git add client/src/components/tracker/CombatantCard.jsx client/src/styles/tracker.css
git commit -m "feat: polish damage/heal interaction with smart Enter and better input"
```

---

### Task 5: Next Turn Keyboard Shortcut

**Files:**
- Modify: `client/src/pages/Tracker.jsx:54-68`
- Modify: `client/src/components/tracker/TurnControls.jsx:33-34`
- Modify: `client/src/styles/tracker.css` (add kbd styling)

- [ ] **Step 1: Add spacebar listener to Tracker.jsx**

In `client/src/pages/Tracker.jsx`, add `nextTurn` to the store subscriptions. After line 27:

```jsx
// Before
const combatState = useCombatStore(s => s.state);
const combatants = useCombatStore(s => s.combatants);

// After
const combatState = useCombatStore(s => s.state);
const combatants = useCombatStore(s => s.combatants);
const nextTurn = useCombatStore(s => s.nextTurn);
```

- [ ] **Step 2: Add spacebar to the existing keydown handler**

In the same file, find the existing `handleKeyDown` inside the `useEffect` (line ~55). Add the spacebar logic inside the function:

```jsx
// Before
useEffect(() => {
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);

// After
useEffect(() => {
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
    // Spacebar → Next Turn (only during combat, only when no input is focused)
    if (e.key === ' ' && combatState === 'combat') {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;
      if (!isEditable) {
        e.preventDefault();
        nextTurn();
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [undo, redo, combatState, nextTurn]);
```

- [ ] **Step 3: Add shortcut hint to Next button in TurnControls**

In `client/src/components/tracker/TurnControls.jsx`, update the Next button (line ~33):

```jsx
{/* Before */}
<button className="btn btn--nav" disabled={combatants.length === 0} onClick={nextTurn}>
  Next &#9654;
</button>

{/* After */}
<button className="btn btn--nav" disabled={combatants.length === 0} onClick={nextTurn} title="Spacebar">
  Next &#9654;
  <kbd className="kbd-hint">Space</kbd>
</button>
```

- [ ] **Step 4: Add kbd-hint CSS**

In `client/src/styles/tracker.css`, add after the turn controls section (search for `turn-info__name` and add after that block):

```css
.kbd-hint {
  display: block;
  font-family: var(--font-body);
  font-size: 0.6rem;
  color: var(--color-text-muted);
  font-weight: 400;
  letter-spacing: 0.05em;
  margin-top: 2px;
}
```

- [ ] **Step 5: Verify**

- Start combat with 3+ combatants
- Press spacebar (no input focused) → advances to next turn
- Click into HP amount input, press spacebar → types a space in the input (does NOT advance turn)
- Click into dice count input, press spacebar → does NOT advance turn
- The Next button shows "Space" hint text below "Next ▶"
- In pre-combat state, spacebar does nothing

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Tracker.jsx client/src/components/tracker/TurnControls.jsx client/src/styles/tracker.css
git commit -m "feat: add spacebar shortcut for Next Turn during combat"
```

---

### Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

```bash
cd client && npx eslint src/ --ext .js,.jsx
```

Expected: 0 errors, 0 warnings (or only pre-existing warnings)

- [ ] **Step 2: Run production build**

```bash
cd client && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Visual check at desktop**

Open `http://localhost:5173/tracker` at full desktop width. Verify all 5 changes work together:
1. Muted text is slightly brighter across the page
2. Pre-combat shows "—" for initiative
3. Start combat → real initiative numbers appear, active card has gold gradient + ▶ arrow
4. Spacebar advances turns
5. HP input shows "10" placeholder, Enter/Shift+Enter works

- [ ] **Step 4: Visual check at mobile**

Resize browser to 375px width. Verify:
- Cards stack correctly
- HP input is readable
- ▶ arrow doesn't break card layout
- kbd hint on Next button is visible but unobtrusive

- [ ] **Step 5: Commit any remaining adjustments**

If any visual tweaks are needed (spacing, sizing), fix and commit:

```bash
git add -A
git commit -m "fix: minor visual adjustments from tracker UX review"
```

Only create this commit if changes were needed. If everything looks good, skip.
