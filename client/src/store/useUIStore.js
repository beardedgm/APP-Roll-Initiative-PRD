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
    // If pushing same type as current top, replace (new selection from list).
    // If pushing different type (e.g. spell from stat block), push on top.
    if (contentStack.length > 0 && contentStack[contentStack.length - 1].type === entry.type) {
      set({ contentStack: [entry] });
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

  // ── Dice roller collapsed/expanded ──
  diceRollerExpanded: (() => {
    try {
      const saved = localStorage.getItem('dice-roller-expanded');
      return saved === 'true';
    } catch {
      return false;
    }
  })(),

  toggleDiceRoller: () => set((state) => {
    const next = !state.diceRollerExpanded;
    try { localStorage.setItem('dice-roller-expanded', String(next)); } catch { /* noop */ }
    return { diceRollerExpanded: next };
  }),

  // ── Per-tab game system toggles ──
  creaturesSystem: '5e',
  spellsSystem: '5e',

  setCreaturesSystem: (system) => set({ creaturesSystem: system }),
  setSpellsSystem: (system) => set({ spellsSystem: system }),
}));

export default useUIStore;
