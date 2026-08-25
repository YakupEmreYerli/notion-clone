"use client";

import { useRef } from "react";

import { Id } from "@/convex/_generated/dataModel";

interface FillHandleProps {
  /** Sürükleme başlarken kaynak hücreyi işaretler. */
  onStart: () => void;
  /** İmlecin altındaki satır değiştikçe hedefi günceller. */
  onTarget: (rowId: Id<"databaseRows">) => void;
  /** Bırakınca aralığı yazar. */
  onCommit: () => void;
  /** Sürükleme her koşulda burada biter (iptal dahil). */
  onEnd: () => void;
}

/**
 * Notion'ın seçili hücre tutamacı. Ölçülen değerler
 * (docs/notion-research/table-parity.md): 9px, `border-radius: 50%`, içi
 * **sayfa arka planı**, 2px `rgb(39,131,222)` halka, `cursor: ns-resize`,
 * sağ-alt köşenin üzerinde ortalı. Dolu mavi nokta DEĞİL.
 * Aşağı/yukarı sürüklenince kaynak değeri aradaki satırlara kopyalar.
 */
export const FillHandle = ({
  onStart,
  onTarget,
  onCommit,
  onEnd,
}: FillHandleProps) => {
  const dragging = useRef(false);

  const rowIdAt = (clientX: number, clientY: number) =>
    document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-row-id]")?.dataset.rowId;

  return (
    <div
      role="button"
      aria-label="Fill cell value down"
      className="bg-background border-table-selection absolute right-0 bottom-0 z-2 size-[9px] translate-x-1/2 translate-y-1/2 cursor-ns-resize touch-none rounded-full border-2"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        // Pointer capture şart: imleç 9px'lik tutamacın dışına çıkar çıkmaz
        // move/up olayları başka elemana gider — sürükleme hiç ilerlemez ve
        // bırakma yakalanmadığı için mavi vurgu ekranda takılı kalır.
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = true;
        onStart();
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        const rowId = rowIdAt(event.clientX, event.clientY);
        if (rowId) onTarget(rowId as Id<"databaseRows">);
      }}
      onPointerUp={(event) => {
        if (!dragging.current) return;
        dragging.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit();
        onEnd();
      }}
      onPointerCancel={() => {
        if (!dragging.current) return;
        dragging.current = false;
        onEnd();
      }}
      // pointerdown'da preventDefault yapılsa da tarayıcı yine bir click
      // üretebilir; hücreye ulaşırsa hücreyi düzenleme moduna sokardı.
      onClick={(event) => event.stopPropagation()}
    />
  );
};
