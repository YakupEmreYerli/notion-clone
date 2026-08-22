import { create } from "zustand";

/**
 * Arşivlenmek üzere olan (çöp kutusuna taşınan) dokümanın id'si.
 * Convex reaktif olduğu için `isArchived: true` yamanması, router.push
 * tamamlanmadan önce ekrana düşüyor ve "Bu sayfa çöp kutusunda" bandı
 * bir an görünüyordu. Navigasyon bitene kadar bu id ile bandı gizliyoruz.
 */
type ArchivingDocStore = {
  archivingId: string | null;
  markArchiving: (id: string) => void;
  clearArchiving: () => void;
};

export const useArchivingDoc = create<ArchivingDocStore>((set) => ({
  archivingId: null,
  markArchiving: (id) => set({ archivingId: id }),
  clearArchiving: () => set({ archivingId: null }),
}));
