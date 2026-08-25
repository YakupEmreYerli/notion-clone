"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const VIEWPORT_MARGIN = 8;

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  /** Kök elemanı çağırana verir (iç içe menüleri bağlamak için). */
  rootRef?: React.RefObject<HTMLDivElement | null>;
  /**
   * Bu elemanın İÇİNDEKİ pointerdown'lar menüyü kapatmaz. İç içe menüler
   * ayrı portal'a çizildiği için `contains()` onları "dışarısı" sayıyor;
   * bu olmadan alt menüye basıldığı anda üst menü kapanır ve alt menü
   * unmount olduğu için `click` olayı hiç ulaşmaz.
   */
  ignoreRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Reusable Notion-tarzı context menu primitive.
 * - `createPortal` ile body'e render edilir (overflow'dan kaçar)
 * - imlecin yanında açılır, viewport dışına taşarsa otomatik kırpılır
 * - dışına tıklanınca / Escape / scroll / resize ile kapanır
 * Görsel dil: koyu gri surface, küçük radius, ince divider, subtle hover.
 */
export const ContextMenu = ({
  open,
  x,
  y,
  onClose,
  className,
  children,
  rootRef,
  ignoreRef,
}: ContextMenuProps) => {
  // Ölçüm sonrası viewport'a kırpılmış konum. `forX`/`forY` hangi çapa için
  // ölçüldüğünü tutar: BAŞKA bir çapa için açılınca eski değer render'da
  // kullanılmaz. Eskiden state doğrudan `{left, top}` idi ve ilk açılışta
  // (0,0) ile başlıyordu — menü bir kare boyunca ekranın sol üstünde
  // boyanıp sonra yerine sıçrıyordu, açılış animasyonu da bunu "uçuş"
  // gibi gösteriyordu.
  const [measured, setMeasured] = useState<{
    left: number;
    top: number;
    forX: number;
    forY: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Ölçüm yapılmadan önce doğrudan çapanın kendisine boyanır; kırpma
  // yalnızca ekranın dışına taşarsa devreye girer.
  const position =
    measured && measured.forX === x && measured.forY === y
      ? { left: measured.left, top: measured.top }
      : { left: x, top: y };

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMeasured({
      forX: x,
      forY: y,
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(x, window.innerWidth - rect.width - VIEWPORT_MARGIN),
      ),
      top: Math.max(
        VIEWPORT_MARGIN,
        Math.min(y, window.innerHeight - rect.height - VIEWPORT_MARGIN),
      ),
    });
  }, [open, x, y]);

  useLayoutEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // İç içe menü ayrı portal'da — DOM olarak "dışarısı" görünür ama
      // mantıken içeridedir.
      if (ignoreRef?.current?.contains(target)) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onCloseEvent = () => onClose();

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onCloseEvent, true);
    window.addEventListener("resize", onCloseEvent);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onCloseEvent, true);
      window.removeEventListener("resize", onCloseEvent);
    };
  }, [open, onClose, ignoreRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={(node) => {
        menuRef.current = node;
        if (rootRef) rootRef.current = node;
      }}
      role="menu"
      style={{
        left: position.left,
        top: position.top,
      }}
      className={cn(
        "fixed z-[10000] w-[250px] rounded-[10px] border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--popup-shadow)] select-none",
        // Notion'dan ÖLÇÜLEN giriş: 200ms, `ease`, opacity + transform,
        // transform-origin sol-üst (`0% top`). Başlangıç değerleri DOM'da
        // yoktu (fotoğraf animasyon bittikten sonra alınmıştı) — Radix
        // menülerimizle aynı zoom-95 açılışı kullanılıyor ki uygulamadaki
        // iki menü türü aynı hissetsin.
        "origin-top-left animate-in fade-in-0 zoom-in-95 duration-200 [animation-timing-function:ease]",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
};

interface ContextMenuItemProps {
  icon?: React.ReactNode;
  label: string;
  /**
   * Olay geçilir ki çağıran, alt menüyü SATIRIN kendi konumuna
   * hizalayabilsin (`event.currentTarget.getBoundingClientRect()`) —
   * fare konumuna değil.
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Alt menüsü olan satırlar Notion'da hover ile de açılır (tıklama şart
   * değil); komşu satırlara geçilince açık alt menü kapanır.
   */
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** Sağdaki paler shortcut / kısayol metni. */
  shortcut?: string;
  /** Chevron gibi sağdaki küçük işaret. */
  trailing?: React.ReactNode;
  className?: string;
}

export const ContextMenuItem = ({
  icon,
  label,
  onClick,
  onMouseEnter,
  disabled,
  shortcut,
  trailing,
  className,
}: ContextMenuItemProps) => {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-[14px] outline-none transition-colors duration-100",
        // Yıkıcı işlemler için KIRMIZI varyant yok: Notion menülerinde
        // "Delete"/"Move to Trash" satırları da normal renkte
        // (bkz. docs/memory/decisions.md). Eskiden `danger` prop'u vardı,
        // kullanıcı kararıyla kaldırıldı — geri eklenmesin.
        disabled
          ? "cursor-default text-muted-foreground/60"
          : "cursor-pointer text-popover-foreground hover:bg-accent",
        className,
      )}
    >
      {icon && (
        <span
          // `:not([class*='size-'])`: kendi boyutunu SÖYLEYEN ikonlar
          // (Notion'un 20px menü ikonları `size-5` taşır) dokunulmadan
          // geçer; boyut vermeyen eski ikonlar 15px'te kalır. Bu guard
          // olmadan descendant seçici svg'nin kendi utility'sini yener.
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px]"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {shortcut && (
        <span className="shrink-0 text-[12px] text-muted-foreground/70">
          {shortcut}
        </span>
      )}
      {trailing && (
        <span className="flex shrink-0 items-center text-muted-foreground/70">
          {trailing}
        </span>
      )}
    </button>
  );
};

export const ContextMenuSeparator = () => (
  <div className="mx-1 my-1 h-px bg-border" />
);

export const ContextMenuLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={cn(
      "px-3 py-1 text-[11px] font-[500] text-muted-foreground select-none",
      className,
    )}
  >
    {children}
  </p>
);