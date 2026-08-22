import { create } from "zustand";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Notion'da doğrulanan davranış: başlık her tuş vuruşunda sidebar'a anında
 * yansır, görünür bir "kaydediliyor" gecikmesi yoktur. Backend yazımı
 * (Toolbar/Title'daki debounce) yine 400ms'de kalıyor — persistence bundan
 * etkilenmez, tek değişen sidebar'ın hangi title'ı GÖSTERDİĞİ. Bu store, o
 * debounce süresince "şu an ekranda yazılmakta olan" başlığı tutar; sidebar
 * satırları varsa bu taslağı, yoksa Convex'ten gelen kalıcı title'ı gösterir.
 */
type LiveTitleDraftsStore = {
  drafts: Record<string, string>;
  setDraft: (id: Id<"documents">, title: string) => void;
  clearDraft: (id: Id<"documents">) => void;
};

export const useLiveTitleDrafts = create<LiveTitleDraftsStore>((set) => ({
  drafts: {},
  setDraft: (id, title) =>
    set((state) => ({ drafts: { ...state.drafts, [id]: title } })),
  clearDraft: (id) =>
    set((state) => {
      if (!(id in state.drafts)) return state;
      const drafts = { ...state.drafts };
      delete drafts[id];
      return { drafts };
    }),
}));
