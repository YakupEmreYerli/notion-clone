"use client";

import { useRef, useState } from "react";
import { File } from "lucide-react";

// Inline "+ New" kart input'u — Notion davranışı (ölçülen):
// - Kolon altında kart biçiminde input belirir ("Type a name…")
// - Enter → kaydet (başlık boşsa isimsiz kart) VE altta yeni boş input açılır
// - Esc → boşsa kapatır (kart oluşmaz)
// - Dışarı tıklama (blur) → metin varsa kaydeder, boşsa kapatır
// - Yeni kart group-by değerini otomatik alır (mutasyon tarafında)
interface CreateCardInputProps {
  /** Her commit'te artırılır — input taze remount olur (Notion'ın "altta
   *  yeni input" davranışı). */
  sequence: number;
  onCommit: (title: string) => void;
  onClose: () => void;
}

export const CreateCardInput = ({
  sequence,
  onCommit,
  onClose,
}: CreateCardInputProps) => {
  const [value, setValue] = useState("");
  const committingRef = useRef(false);

  const commit = (title: string) => {
    committingRef.current = true;
    onCommit(title);
    setValue("");
    // Enter akışında blur'ı bastır (input açık kalır, sequence ile remount
    // olur) — blur handler'ı çift commit yapmasın.
    requestAnimationFrame(() => {
      committingRef.current = false;
    });
  };

  return (
    <div
      className="mb-2"
      style={{
        backgroundColor: "var(--kanban-card-bg)",
        borderRadius: "var(--kanban-card-radius)",
        boxShadow: "var(--kanban-card-shadow)",
        padding:
          "var(--kanban-card-pad-top) var(--kanban-card-pad-x) var(--kanban-card-pad-bottom)",
      }}
    >
      <input
        key={sequence}
        autoFocus
        value={value}
        placeholder="Type a name…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit(value);
          }
          if (e.key === "Escape") onClose();
        }}
        onBlur={() => {
          // Enter akışında blur ateşlenirse yut; metin varsa kaydet-kapat,
          // boşsa sadece kapat.
          if (committingRef.current) return;
          if (value.trim()) {
            onCommit(value);
          }
          onClose();
        }}
        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
        style={{ fontWeight: 500, lineHeight: 1.5 }}
      />
      {/* Notion yeni kartta "Add property" hücrelerini gösterir — boş hücre
          satırı görsel ipucu olarak kalır. */}
      <div className="mt-1 flex items-center gap-1.5 pl-1 text-xs text-muted-foreground/60">
        <File className="h-3 w-3" />
        Add property
      </div>
    </div>
  );
};