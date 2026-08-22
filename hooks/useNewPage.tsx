import { create } from "zustand";

type NewPageStore = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useNewPage = create<NewPageStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
