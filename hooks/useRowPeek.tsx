import { create } from "zustand";
import { Id } from "@/convex/_generated/dataModel";

// Row peek: board'da bir karta tıklayınca açılan satır property düzenleyici
// side paneli. Satırlar doküman değil (önceki karar) — peek, satırın
// title + property hücrelerini inline düzenler.
interface RowPeekState {
  rowId: Id<"databaseRows"> | null;
  databaseId: Id<"documents"> | null;
  open: (rowId: Id<"databaseRows">, databaseId: Id<"documents">) => void;
  onClose: () => void;
}

export const useRowPeek = create<RowPeekState>((set) => ({
  rowId: null,
  databaseId: null,
  open: (rowId, databaseId) => set({ rowId, databaseId }),
  onClose: () => set({ rowId: null, databaseId: null }),
}));