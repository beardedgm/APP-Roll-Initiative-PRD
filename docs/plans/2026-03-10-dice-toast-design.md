# Dice Roll Toast Notification

## Problem
When a DM rolls dice — from the dice roller panel or from inline stat block links — the result only appears in the DiceRoller panel on the right side. This is easy to miss or forget, especially mid-combat.

## Solution
A persistent toast notification that slides up from the bottom-center of the screen on every dice roll, showing the result prominently. It stays visible until the DM explicitly dismisses it via an X button.

## Behavior
- **Trigger**: Any `rollDice()` call — DiceRoller buttons or stat block dice links
- **Position**: Fixed, bottom-center of viewport, high z-index
- **Content**: Dice label (e.g. "2d6+5"), large total, individual roll breakdown
- **Dismiss**: X close button in top-right corner only
- **Stacking**: One toast at a time. New roll replaces previous with fresh slide-up animation.
- **Animation**: Slide up from below on appear, slide down on dismiss. Brief scale pulse on total number.

## Approach
Custom component (no library). Subscribe to Zustand `diceHistory` array length changes to detect new rolls.

## Style
- Dark card background (`--color-bg-card`) with gold border and glow
- Matches existing dark fantasy aesthetic
- Gold accent on total number

## Files
| File | Change |
|------|--------|
| `client/src/components/tracker/DiceToast.jsx` | New component |
| `client/src/styles/tracker.css` | Toast CSS |
| `client/src/pages/Tracker.jsx` | Render `<DiceToast />` |

No store changes — reads existing `diceHistory`.
