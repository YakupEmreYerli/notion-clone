"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { TextSelectionMenu } from "@/components/editor/TextSelectionMenu";

// Notion'dan ölçülen değerler (dark tema):
//  - Panel ile selection arası boşluk 16px (selection.bottom + 16).
//  - Menü varsayılan olarak selection'ın ALTINDA açılır (bottom-start);
//    altta yer yoksa aynı 16px boşlukla yukarı flip eder.
//  - Viewport kenarına en az 8px mesafe bırakılır.
const MENU_GAP = 16;
const VIEWPORT_MARGIN = 8;

/**
 * BlockNote'un FormattingToolbarController'ı bu uygulamada floating reference'ı
 * (posToDOMRect) bozuk üretiyor — menü selection'ı hiç takip etmiyor, her zaman
 * (0,0)'da açılıyor. Bu controller, floating-ui'nin referans mekanizması yerine
 * tarayıcının native Selection rect'ini kullanır (Notion'ın yaptığı gibi) ve
 * menüyü position:fixed ile viewport'a sabitler. Göster/gizle ve selection'a
 * bağlı re-evaluate mantığı FormattingToolbarExtension'dan aynen miras kalır.
 */
export const TextSelectionMenuController = () => {
  const editor = useBlockNoteEditor();
  const formattingToolbar = useExtension(FormattingToolbarExtension, {
    editor,
  });
  const show = useExtensionState(FormattingToolbarExtension, { editor });

  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [menuSize, setMenuSize] = useState<{ width: number; height: number }>({
    width: 192,
    height: 300,
  });

  // Menü boyutunu layout tabanlı ölç (offsetHeight — pop animasyonundaki
  // scale transform'undan etkilenmez). Callback ref mount'ta çalışır.
  const wrapperRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w > 0 && h > 0) {
      setMenuSize((prev) =>
        prev.width === w && prev.height === h
          ? prev
          : { width: w, height: h },
      );
    }
  }, []);

  // Menü açıkken native selection'ı takip et. Scroll/resize sırasında da
  // yeniden ölç (position:fixed + viewport koordinatları). İlk okuma rAF ile
  // paint'ten önce yapılır. Seçim çöktüğünde (boş bir yere tıklama) menü
  // kapanır — Notion'daki gibi.
  useEffect(() => {
    if (!show) return;

    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelectionRect(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelectionRect(null);
        return;
      }
      setSelectionRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - rect.left) < 0.5 &&
          Math.abs(prev.top - rect.top) < 0.5 &&
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return rect;
      });
    };

    const raf = requestAnimationFrame(update);
    document.addEventListener("selectionchange", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [show]);

  // Dış tık ve boş alana tıklamada kapanma: menünün kendisi veya
  // editor içeriği (contenteditable) dışına tıklanınca kapanır.
  useEffect(() => {
    if (!show) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".zsm-floating")) return;
      if (target.closest('[contenteditable="true"]')) return;
      formattingToolbar.store.setState(false);
      setSelectionRect(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [show, formattingToolbar]);

  // Escape menüyü kapatır (floating-ui useDismiss karşılığı).
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        formattingToolbar.store.setState(false);
        editor.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [show, formattingToolbar, editor]);

  const style = useMemo(() => {
    if (!selectionRect) return null;
    const { width, height } = menuSize;

    let left = Math.round(selectionRect.left);
    let top = Math.round(selectionRect.bottom) + MENU_GAP;

    if (left + width > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - VIEWPORT_MARGIN - width;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
      const aboveTop = Math.round(selectionRect.top) - MENU_GAP - height;
      if (aboveTop >= VIEWPORT_MARGIN) {
        top = aboveTop;
      } else {
        top = Math.max(
          VIEWPORT_MARGIN,
          window.innerHeight - VIEWPORT_MARGIN - height,
        );
      }
    }

    return {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 40,
    } as const;
  }, [selectionRect, menuSize]);

  if (!show || !selectionRect || !style) return null;

  // Menüyü document.body'ye portal'la: `main` gibi overflow/scrool'lu bir
  // container'ın içinde `position:fixed` bazı tarayıcılarda viewport yerine
  // o container'a göre çözülür ve sayfa aşağı kaydırıldığında menü "en başa"
  // fırlar. Portal bu sınıf hatayı kökten çözer (floating-ui'nin de yaptığı
  // gibi). createPortal React context'i korur, useBlockNoteEditor çalışmaya
  // devam eder.
  return createPortal(
    <div ref={wrapperRef} className="zsm-floating" style={style}>
      <TextSelectionMenu />
    </div>,
    document.body,
  );
};

export default TextSelectionMenuController;