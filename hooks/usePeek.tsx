import { create } from "zustand";
import { Id } from "@/convex/_generated/dataModel";

/** Panelde render edilebilen modlar. "full"/"tab" bir görünüm değil, tek seferlik aksiyondur — hatırlanmaz. */
export type PeekPanelMode = "side" | "center";
export type PeekMode = PeekPanelMode | "full" | "tab";

const STORAGE_KEY = "zotion-peek-mode";

/** Yeni bir alt sayfa oluşturulduğunda kullanılacak varsayılan mod. Sadece
 * side/center kalıcıdır — "Full page"/"New tab" seçimi bir sonraki "Add
 * sub-page" tıklamasını asla otomatik olarak tam sayfaya götürmemeli. */
export const getStoredPeekMode = (): PeekPanelMode => {
  if (typeof window === "undefined") return "center";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "side" ? "side" : "center";
};

const setStoredPeekMode = (mode: PeekPanelMode) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
};

type PeekStore = {
  documentId: Id<"documents"> | null;
  mode: PeekPanelMode;
  onOpen: (documentId: Id<"documents">) => void;
  onClose: () => void;
  setMode: (mode: PeekPanelMode) => void;
};

export const usePeek = create<PeekStore>((set) => ({
  documentId: null,
  mode: "center",
  onOpen: (documentId) => set({ documentId, mode: getStoredPeekMode() }),
  onClose: () => set({ documentId: null }),
  setMode: (mode) => {
    setStoredPeekMode(mode);
    set({ mode });
  },
}));
