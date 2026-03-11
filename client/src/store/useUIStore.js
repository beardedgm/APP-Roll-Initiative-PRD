import { create } from 'zustand';

const useUIStore = create((set) => ({
  activeModal: null,
  statBlockSlug: null,
  editMonsterData: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null, editMonsterData: null }),
  setStatBlockSlug: (slug) => set({ statBlockSlug: slug }),
  openEditMonster: (monster) => set({ activeModal: 'monster-form', editMonsterData: monster }),
}));

export default useUIStore;
