import { create } from 'zustand';

const useUIStore = create((set) => ({
  activeModal: null,
  statBlockSlug: null,
  editMonsterData: null,
  modalData: null,
  openModal: (id, data = null) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, editMonsterData: null, modalData: null }),
  setStatBlockSlug: (slug) => set({ statBlockSlug: slug }),
  openEditMonster: (monster) => set({ activeModal: 'monster-form', editMonsterData: monster, modalData: null }),
}));

export default useUIStore;
