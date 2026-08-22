import { create } from "zustand";

type AccountModalStore = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useAccountModal = create<AccountModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
