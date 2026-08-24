"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { DropTarget } from "./drop-target";

// Board için özel pointer drag motoru. dnd-kit kullanılmaz — ölçülen Notion
// davranışları dnd-kit'in sınırlarını aşıyor: (1) Esc ile programatik iptal
// yok, (2) kaynak kart drag boyunca yerinde ve OPAK kalır, (3) hedef kolon
// kartları kaymaz (placeholder yok), (4) auto-scroll ~100px kenar eşiği.
//
// Motor kuralları (ölçüm: design/kanban-tokens.md §10):
// - 8px hareket eşiği: altı tık sayılır (click geçer), üstü drag başlatır
// - Klon portal'a render edilir, 0.4 opacity, pointer'ı 1:1 takip eder
//   (klon top = pointerY + grabY)
// - Drop hedefi YALNIZCA drop anında hesaplanır (canlı hesaplama yok)
// - Esc / pointercancel → iptal, mutation çağrılmaz
// - Kenara ~100px kala auto-scroll; hız mesafeyle artar (rAF)
// - Tümü pointer events — touch + mouse tek kod yolu

export interface ActiveDrag {
  rowId: Id<"databaseRows">;
  groupKey: string;
  /** Pointer'ın kartın üstünden uzaklığı (kartTop - pointerY, negatif olabilir). */
  grabY: number;
  x: number;
  y: number;
}

export interface BoardDndOptions {
  /** Yatay scroller (board'ın overflow-x-auto kabı). */
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  /** Drop anında pointer pozisyonundan hedefi hesaplar (DOM ölçümleri). */
  getDropTarget: (x: number, y: number, sourceRowId: Id<"databaseRows">) => DropTarget | null;
  onDrop: (target: DropTarget, sourceRowId: Id<"databaseRows">) => void;
}

const DRAG_THRESHOLD = 8;
const EDGE = 100;
const MAX_SPEED = 40;

export function useBoardDnd({
  scrollerRef,
  getDropTarget,
  onDrop,
}: BoardDndOptions) {
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const candidateRef = useRef<{
    rowId: Id<"databaseRows">;
    groupKey: string;
    startX: number;
    startY: number;
    grabY: number;
  } | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  /** Drag gerçekleştiyse bir sonraki click'i bastırır (eşik aşıldı ama tık
   *  event'i yine de ateşlenir). */
  const suppressClickRef = useRef(false);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
    candidateRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  // rAF döngüsü: klon transform'u + auto-scroll. React state'e dokunmaz,
  // klon pozisyonu imperative güncellenir — drag boyunca sıfır re-render.
  // Fonksiyon deklarasyonu: kendine referans (rekürsif frame planlama)
  // react-compiler lint kuralına takılmasın diye hoisted kullanılır; gövde
  // yalnızca ref'lere dokunur, bu yüzden ilk render'ın closure'ı kalıcıdır.
  function loop() {
    const d = dragRef.current;
    const clone = cloneRef.current;
    // Klon ilk framede henüz mount olmamış olabilir (React state async);
    // döngü HER ZAMAN yeniden planlanır, yoksa ilk framede ölür.
    if (d && clone) {
      const { x, y } = pointerRef.current;
      clone.style.transform = `translate3d(${x}px, ${y + d.grabY}px, 0)`;

      // Auto-scroll: scroller kenarına ~100px kala, mesafeyle artan hız.
      const scroller = scrollerRef.current;
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        const speedOf = (dist: number) =>
          dist <= 0
            ? MAX_SPEED
            : dist < EDGE
              ? ((EDGE - dist) / EDGE) * MAX_SPEED
              : 0;
        const dx =
          x > rect.right - EDGE
            ? speedOf(rect.right - x)
            : x < rect.left + EDGE
              ? -speedOf(x - rect.left)
              : 0;
        if (dx) scroller.scrollLeft += dx;
        // Dikey: board sayfa akışında olduğu için viewport kenarına göre.
        const dy =
          y > window.innerHeight - EDGE
            ? speedOf(window.innerHeight - y)
            : y < EDGE
              ? -speedOf(y)
              : 0;
        if (dy) window.scrollBy(0, dy);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  const beginDrag = useCallback(
    (candidate: NonNullable<typeof candidateRef.current>) => {
      suppressClickRef.current = true;
      const d: ActiveDrag = {
        rowId: candidate.rowId,
        groupKey: candidate.groupKey,
        grabY: candidate.grabY,
        x: candidate.startX,
        y: candidate.startY,
      };
      dragRef.current = d;
      setDrag(d);
      rafRef.current = requestAnimationFrame(loop);
    },
    // loop hoisted fonksiyon deklarasyonu ve yalnızca ref'lere dokunur —
    // deps'e eklemek her render'da beginDrag'i değiştirir, gereksiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Drag aktifken global pointer/keyboard dinleyicileri.
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const candidate = candidateRef.current;
      if (!candidate) return;
      const dx = e.clientX - candidate.startX;
      const dy = e.clientY - candidate.startY;
      if (!dragRef.current && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        beginDrag(candidate);
      }
      if (dragRef.current) {
        pointerRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = dragRef.current;
      const candidate = candidateRef.current;
      if (d) {
        const target = getDropTarget(e.clientX, e.clientY, d.rowId);
        endDrag();
        if (target) onDrop(target, d.rowId);
      } else if (candidate) {
        // Eşik aşılmadı → tık; drag yok.
        candidateRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragRef.current) {
        e.preventDefault();
        endDrag();
      }
    };

    const onPointerCancel = () => {
      if (dragRef.current) endDrag();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [beginDrag, endDrag, getDropTarget, onDrop]);

  // Cleanup unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      rowId: Id<"databaseRows">,
      groupKey: string,
      cardTop: number,
    ) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      candidateRef.current = {
        rowId,
        groupKey,
        startX: e.clientX,
        startY: e.clientY,
        grabY: cardTop - e.clientY,
      };
    },
    [],
  );

  return { drag, onPointerDown, cloneRef, suppressClickRef };
}