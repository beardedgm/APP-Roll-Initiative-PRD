import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  // ── Existing modal state ──
  activeModal: null,
  statBlockSlug: null,
  editMonsterData: null,
  modalData: null,
  openModal: (id, data = null) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, editMonsterData: null, modalData: null }),
  setStatBlockSlug: (slug) => set({ statBlockSlug: slug }),
  openEditMonster: (monster) => set({ activeModal: 'monster-form', editMonsterData: monster, modalData: null }),

  // ── Content viewer stack ──
  // Each entry: { type: 'creature' | 'spell', slug: string, name: string }
  contentStack: [],
  selectedCreatureSlug: null,

  pushContent: (entry) => {
    const { contentStack } = get();
    // If pushing same type as current top, replace only the top entry — preserves
    // prior navigation history (e.g. creature → spell → creature still allows back).
    // If pushing different type (e.g. spell from stat block), push on top.
    if (contentStack.length > 0 && contentStack[contentStack.length - 1].type === entry.type) {
      set({ contentStack: [...contentStack.slice(0, -1), entry] });
    } else {
      set({ contentStack: [...contentStack, entry] });
    }
    if (entry.type === 'creature') {
      set({ selectedCreatureSlug: entry.slug });
    }
  },

  popContent: () => {
    const { contentStack } = get();
    if (contentStack.length <= 1) {
      set({ contentStack: [], selectedCreatureSlug: null });
      return;
    }
    const newStack = contentStack.slice(0, -1);
    const top = newStack[newStack.length - 1];
    set({
      contentStack: newStack,
      selectedCreatureSlug: top?.type === 'creature' ? top.slug : get().selectedCreatureSlug,
    });
  },

  clearContent: () => set({ contentStack: [], selectedCreatureSlug: null }),

  setSelectedCreature: (slug) => set({ selectedCreatureSlug: slug }),

  // ── Floating dice roller: open/closed + position ──
  // Defaults to open — rolling is core to the table loop, and the floating
  // panel no longer steals space from the right-panel info viewer.
  diceRollerOpen: (() => {
    try {
      const saved = localStorage.getItem('dice-roller-open');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  })(),

  // Persisted top-left position { x, y }, or null to use the CSS bottom-right anchor.
  diceRollerPos: (() => {
    try {
      const saved = localStorage.getItem('dice-roller-pos');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') ? parsed : null;
    } catch {
      return null;
    }
  })(),

  toggleDiceRoller: () => set((state) => {
    const next = !state.diceRollerOpen;
    try { localStorage.setItem('dice-roller-open', String(next)); } catch { /* noop */ }
    return { diceRollerOpen: next };
  }),

  closeDiceRoller: () => set(() => {
    try { localStorage.setItem('dice-roller-open', 'false'); } catch { /* noop */ }
    return { diceRollerOpen: false };
  }),

  setDiceRollerPos: (pos) => set(() => {
    try { localStorage.setItem('dice-roller-pos', JSON.stringify(pos)); } catch { /* noop */ }
    return { diceRollerPos: pos };
  }),

  // ── Per-tab game system toggles ──
  creaturesSystem: '5e',
  spellsSystem: '5e',

  setCreaturesSystem: (system) => set({ creaturesSystem: system }),
  setSpellsSystem: (system) => set({ spellsSystem: system }),
}));

export default useUIStore;
