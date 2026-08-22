import { create } from "zustand";

export type AuthMode = "sign-in" | "sign-up";

type AuthModalStore = {
  mode: AuthMode;
  isOpen: boolean;
  onOpen: (mode?: AuthMode) => void;
  onClose: () => void;
  setMode: (mode: AuthMode) => void;
};

export const useAuthModal = create<AuthModalStore>((set) => ({
  mode: "sign-in",
  isOpen: false,
  onOpen: (mode: AuthMode = "sign-in") => set({ isOpen: true, mode }),
  onClose: () => set({ isOpen: false }),
  setMode: (mode: AuthMode) => set({ mode }),
}));
