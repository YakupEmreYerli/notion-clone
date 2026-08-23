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
}: ContextMenuProps) => {
  const [position, setPosition] = useState({ left: x, top: y });
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ left: position.left, top: position.top }}
      className={cn(
        "fixed z-[10000] w-[250px] rounded-[10px] border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--popup-shadow)] select-none",
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
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
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
  disabled,
  danger,
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
      className={cn(
        "flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-[14px] outline-none transition-colors duration-100",
        disabled
          ? "cursor-default text-muted-foreground/60"
          : cn(
              "cursor-pointer text-popover-foreground hover:bg-accent",
              danger && "text-red-400 hover:bg-red-500/10 hover:text-red-400",
            ),
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex size-[18px] shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-[15px] [&_svg]:shrink-0",
            danger && !disabled && "text-red-400/70",
          )}
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