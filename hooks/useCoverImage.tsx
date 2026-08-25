import { create } from "zustand";
import { Id } from "@/convex/_generated/dataModel";

type CoverImageStore = {
  documentId?: Id<"documents">;
  /** Kapak bir database satırına uygulanacaksa hedef satır. */
  rowId?: Id<"databaseRows">;
  url?: string;
  isOpen: boolean;
  // `documentId` zorunlu: bu modal PeekModal (bir alt sayfa) veya ana sayfa
  // route'undan açılabilir — route parametresine (`useParams`) güvenmek,
  // peek içinden açıldığında kapağı yanlışlıkla arka plandaki ana sayfaya
  // uygulardı. Kapağı gerçekten hangi belgenin açtığı burada, açılış anında
  // sabitlenir.
  onOpen: (documentId: Id<"documents">) => void;
  /** Side peek'ten açılır: kapak dokümana değil satıra uygulanır. */
  onOpenRow: (rowId: Id<"databaseRows">, url?: string) => void;
  onClose: () => void;
  onReplace: (documentId: Id<"documents">, url: string) => void;
};

export const useCoverImage = create<CoverImageStore>((set) => ({
  documentId: undefined,
  rowId: undefined,
  url: undefined,
  isOpen: false,
  onOpen: (documentId) =>
    set({ isOpen: true, documentId, rowId: undefined, url: undefined }),
  onOpenRow: (rowId, url) =>
    set({ isOpen: true, rowId, documentId: undefined, url }),
  onClose: () =>
    set({ isOpen: false, documentId: undefined, rowId: undefined, url: undefined }),
  onReplace: (documentId, url) =>
    set({ isOpen: true, documentId, rowId: undefined, url }),
}));
