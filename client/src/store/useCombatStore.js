import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId, generateEncounterId } from '../utils/ids';
import { migrateState } from '../utils/migration';

const MAX_UNDO_HISTORY = 50;
const MAX_DICE_HISTORY = 12;

function getDefaultState() {
  return {
    id: generateEncounterId(),
    name: 'New Encounter',
    state: 'pre-combat',
    currentRound: 1,
    activeCreatureId: null,
    combatants: [],
    diceHistory: [],
    cloudId: null,     // MongoDB _id when saved to cloud
    shareCode: null,   // share code for player view links
    showRollsToPlayers: false,
  };
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

const useCombatStore = create(
  persist(
    (set, get) => ({
      // ── Core State ──────────────────────────────────────────
      ...getDefaultState(),

      // ── Undo/Redo (transient) ───────────────────────────────
      undoStack: [],
      redoStack: [],
      latestSharedRoll: null, // { id, label, total, rolls, sides, modifier, advantage, timestamp }

      // ── Helpers ─────────────────────────────────────────────
      _pushUndo() {
        const { undoStack, id, name, state, currentRound, activeCreatureId, combatants, diceHistory } = get();
        const snapshot = JSON.stringify({ id, name, state, currentRound, activeCreatureId, combatants, diceHistory });
        const newStack = [...undoStack, snapshot];
        if (newStack.length > MAX_UNDO_HISTORY) newStack.shift();
        set({ undoStack: newStack, redoStack: [] });
      },

      _restoreSnapshot(snapshot) {
        const parsed = JSON.parse(snapshot);
        set({
          id: parsed.id,
          name: parsed.name,
          state: parsed.state,
          currentRound: parsed.currentRound,
          activeCreatureId: parsed.activeCreatureId,
          combatants: parsed.combatants,
          diceHistory: parsed.diceHistory,
        });
      },

      // ── Actions ─────────────────────────────────────────────
      undo() {
        const { undoStack, redoStack } = get();
        if (undoStack.length === 0) return;
        const { id, name, state, currentRound, activeCreatureId, combatants, diceHistory } = get();
        const currentSnapshot = JSON.stringify({ id, name, state, currentRound, activeCreatureId, combatants, diceHistory });
        const prev = undoStack[undoStack.length - 1];
        set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, currentSnapshot],
        });
        get()._restoreSnapshot(prev);
      },

      redo() {
        const { undoStack, redoStack } = get();
        if (redoStack.length === 0) return;
        const { id, name, state, currentRound, activeCreatureId, combatants, diceHistory } = get();
        const currentSnapshot = JSON.stringify({ id, name, state, currentRound, activeCreatureId, combatants, diceHistory });
        const next = redoStack[redoStack.length - 1];
        set({
          undoStack: [...undoStack, currentSnapshot],
          redoStack: redoStack.slice(0, -1),
        });
        get()._restoreSnapshot(next);
      },

      addCombatant({ name, maxHP, ac, initMod, quantity, type, initiative, monsterSlug }) {
        get()._pushUndo();
        const combatState = get().state;
        const newCombatants = [];
        const count = Math.min(10, Math.max(1, quantity || 1));

        for (let i = 0; i < count; i++) {
          const c = {
            id: generateId(),
            name: count > 1 ? `${name} ${i + 1}` : name,
            type,
            initiative: combatState === 'combat' ? initiative : 0,
            initiativeModifier: initMod || 0,
            ac: ac || 10,
            hp: { current: maxHP, max: maxHP },
            status: 'normal',
          };
          if (monsterSlug) c.monsterSlug = monsterSlug;
          newCombatants.push(c);
        }

        set(s => {
          const updated = [...s.combatants, ...newCombatants];
          if (s.state === 'combat') {
            updated.sort((a, b) => b.initiative - a.initiative);
          }
          return { combatants: updated };
        });
      },

      removeCombatant(id) {
        get()._pushUndo();
        set(s => {
          const idx = s.combatants.findIndex(c => c.id === id);
          if (idx === -1) return {};
          const wasActive = s.activeCreatureId === id;
          const updated = s.combatants.filter(c => c.id !== id);
          let newActive = s.activeCreatureId;

          if (wasActive) {
            if (updated.length === 0) {
              newActive = null;
            } else {
              const newIdx = Math.min(idx, updated.length - 1);
              newActive = updated[newIdx].id;
            }
          }

          if (s.state === 'pre-combat') newActive = null;
          return { combatants: updated, activeCreatureId: newActive };
        });
      },

      applyDamageHeal(id, action, amount) {
        if (isNaN(amount) || amount <= 0) return false;
        get()._pushUndo();
        set(s => {
          const combatants = s.combatants.map(c => {
            if (c.id !== id) return c;
            const delta = action === 'damage' ? -amount : amount;
            const newHP = Math.max(0, Math.min(c.hp.max, c.hp.current + delta));
            return {
              ...c,
              hp: { ...c.hp, current: newHP },
              status: newHP <= 0 ? 'unconscious' : 'normal',
            };
          });
          return { combatants };
        });
        return true;
      },

      // ── Turn Navigation ─────────────────────────────────────
      canGoPrev() {
        const { combatants, currentRound, activeCreatureId } = get();
        if (combatants.length === 0) return false;
        if (currentRound === 1) {
          return activeCreatureId !== combatants[0].id;
        }
        return true;
      },

      nextTurn() {
        const s = get();
        if (s.combatants.length === 0 || s.state !== 'combat') return;
        get()._pushUndo();
        const currentIdx = s.combatants.findIndex(c => c.id === s.activeCreatureId);
        const nextIdx = currentIdx + 1;

        if (nextIdx >= s.combatants.length) {
          set({
            currentRound: s.currentRound + 1,
            activeCreatureId: s.combatants[0].id,
          });
        } else {
          set({ activeCreatureId: s.combatants[nextIdx].id });
        }
      },

      prevTurn() {
        if (!get().canGoPrev()) return;
        get()._pushUndo();
        const s = get();
        const currentIdx = s.combatants.findIndex(c => c.id === s.activeCreatureId);
        const prevIdx = currentIdx - 1;

        if (prevIdx < 0) {
          set({
            currentRound: Math.max(1, s.currentRound - 1),
            activeCreatureId: s.combatants[s.combatants.length - 1].id,
          });
        } else {
          set({ activeCreatureId: s.combatants[prevIdx].id });
        }
      },

      // ── Combat State Machine ────────────────────────────────
      startCombat(initiativeMap) {
        // initiativeMap: { [combatantId]: number }
        get()._pushUndo();
        set(s => {
          const combatants = s.combatants.map(c => ({
            ...c,
            initiative: initiativeMap[c.id] ?? c.initiative,
          }));
          combatants.sort((a, b) => b.initiative - a.initiative);
          return {
            combatants,
            state: 'combat',
            currentRound: 1,
            activeCreatureId: combatants[0]?.id ?? null,
          };
        });
      },

      endCombat() {
        get()._pushUndo();
        set({ state: 'pre-combat', activeCreatureId: null });
      },

      // ── Drag & Drop Reorder ─────────────────────────────────
      reorderCombatant(sourceId, targetId) {
        get()._pushUndo();
        set(s => {
          const combatants = [...s.combatants];
          const sourceIdx = combatants.findIndex(c => c.id === sourceId);
          const targetIdx = combatants.findIndex(c => c.id === targetId);
          if (sourceIdx === -1 || targetIdx === -1) return {};

          const [source] = combatants.splice(sourceIdx, 1);
          const newTargetIdx = combatants.findIndex(c => c.id === targetId);
          combatants.splice(newTargetIdx, 0, source);

          const insertedIdx = combatants.findIndex(c => c.id === sourceId);
          const prev = combatants[insertedIdx - 1];
          const next = combatants[insertedIdx + 1];

          if (prev || next) {
            if (!prev) {
              source.initiative = next.initiative + 1;
            } else if (!next) {
              source.initiative = prev.initiative - 1;
            } else {
              source.initiative = (prev.initiative + next.initiative) / 2;
            }
          }

          return { combatants };
        });
      },

      // ── Encounter Management ────────────────────────────────
      renameEncounter(name) {
        get()._pushUndo();
        set({ name });
      },

      resetEncounter() {
        const s = get();
        const pcs = s.combatants
          .filter(c => c.type === 'player')
          .map(pc => ({ ...pc, initiative: 0, status: 'normal' }));
        const preservedHistory = s.diceHistory || [];
        const preservedName = s.name;

        set({
          ...getDefaultState(),
          name: preservedName,
          combatants: pcs,
          diceHistory: preservedHistory,
          undoStack: [],
          redoStack: [],
          showRollsToPlayers: false,
          latestSharedRoll: null,
        });
      },

      loadSnapshot(snapshot) {
        set({
          ...snapshot,
          undoStack: [],
          redoStack: [],
        });
      },

      setCloudId(cloudId) {
        set({ cloudId });
      },

      setShareCode(shareCode) {
        set({ shareCode });
      },

      clearAll() {
        set({
          ...getDefaultState(),
          undoStack: [],
          redoStack: [],
        });
      },

      // ── Dice Roller ─────────────────────────────────────────
      rollDice({ sides, count, modifier, advantage }) {
        const rolls = advantage !== 'normal'
          ? [rollDie(sides), rollDie(sides)]
          : Array.from({ length: count }, () => rollDie(sides));

        let rawSum;
        if (advantage === 'advantage') rawSum = Math.max(...rolls);
        else if (advantage === 'disadvantage') rawSum = Math.min(...rolls);
        else rawSum = rolls.reduce((a, b) => a + b, 0);

        const total = rawSum + modifier;
        const entry = {
          id: generateId(),
          sides,
          count: advantage !== 'normal' ? 1 : count,
          modifier,
          advantage,
          rolls,
          total,
        };

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

        return entry;
      },

      clearDiceHistory() {
        set({ diceHistory: [] });
      },

      toggleShowRolls() {
        set(s => ({ showRollsToPlayers: !s.showRollsToPlayers }));
      },
    }),
    {
      name: 'dnd_initiative_state',
      partialize: (state) => ({
        id: state.id,
        name: state.name,
        state: state.state,
        currentRound: state.currentRound,
        activeCreatureId: state.activeCreatureId,
        combatants: state.combatants,
        diceHistory: state.diceHistory,
        cloudId: state.cloudId,
        shareCode: state.shareCode,
        showRollsToPlayers: state.showRollsToPlayers,
      }),
      merge: (persisted, current) => {
        if (!persisted) return current;
        const migrated = migrateState(persisted);
        // Validate shape
        if (!Array.isArray(migrated.combatants)) migrated.combatants = [];
        if (!Array.isArray(migrated.diceHistory)) migrated.diceHistory = [];
        if (typeof migrated.currentRound !== 'number' || migrated.currentRound < 1) migrated.currentRound = 1;
        if (migrated.state !== 'combat' && migrated.state !== 'pre-combat') migrated.state = 'pre-combat';
        if (!migrated.id) migrated.id = generateEncounterId();
        if (!migrated.name) migrated.name = 'New Encounter';
        if (migrated.activeCreatureId !== null) {
          const exists = migrated.combatants.some(c => c.id === migrated.activeCreatureId);
          if (!exists) migrated.activeCreatureId = null;
        }
        return { ...current, ...migrated };
      },
    }
  )
);

// ── Cross-Tab Sync via BroadcastChannel ──────────────────────
// Keeps the /play player view tab in sync with the /tracker tab
if (typeof BroadcastChannel !== 'undefined') {
  const channel = new BroadcastChannel('combat-store');
  let isBroadcasting = false;

  // Broadcast local changes to other tabs
  useCombatStore.subscribe((state) => {
    if (isBroadcasting) return;
    channel.postMessage({
      id: state.id,
      name: state.name,
      state: state.state,
      currentRound: state.currentRound,
      activeCreatureId: state.activeCreatureId,
      combatants: state.combatants,
      diceHistory: state.diceHistory,
      cloudId: state.cloudId,
      shareCode: state.shareCode,
      showRollsToPlayers: state.showRollsToPlayers,
      latestSharedRoll: state.latestSharedRoll,
    });
  });

  // Receive changes from other tabs
  channel.onmessage = (event) => {
    isBroadcasting = true;
    useCombatStore.setState(event.data);
    isBroadcasting = false;
  };
}

export default useCombatStore;
