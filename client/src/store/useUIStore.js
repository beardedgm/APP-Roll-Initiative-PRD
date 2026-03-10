import { create } from 'zustand';

const useUIStore = create((set) => ({
  activeModal: null,
  statBlockSlug: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  setStatBlockSlug: (slug) => set({ statBlockSlug: slug }),
}));

export default useUIStore;
