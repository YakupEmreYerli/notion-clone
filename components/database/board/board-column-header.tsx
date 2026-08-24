"use client";

import { MoreHorizontal, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { groupColorVars } from "./board-colors";

// Kolon başlığı — Notion ölçümleri: satır 40px; kolon zemininden ayrı bir
// yüzey çizmez. Başlık badge'i h:20 radius:4 pad-inline:6 font:14.
interface BoardColumnHeaderProps {
  label: string;
  color?: string;
  count: number;
  hovered: boolean;
  onAddCard?: () => void;
  onOpenMenu?: (e: React.MouseEvent) => void;
}

export const BoardColumnHeader = ({
  label,
  color,
  count,
  hovered,
  onAddCard,
  onOpenMenu,
}: BoardColumnHeaderProps) => {
  const colors = groupColorVars(color);

  return (
    <div
      data-testid="board-column-header"
      className="flex h-10 shrink-0 items-center"
      style={{
        padding: "0 var(--kanban-col-header-pad-x)",
        marginBottom: 3,
      }}
    >
      <button
        type="button"
        className="flex h-5 max-w-full min-w-0 flex-shrink items-center overflow-hidden rounded px-1.5 text-sm leading-none"
        style={{
          backgroundColor: colors.badgeBg,
          color: colors.badgeFg,
          height: 20,
          borderRadius: 4,
          paddingInline: 6,
          fontSize: 14,
        }}
        title={label}
      >
        <span className="truncate">{label}</span>
      </button>
      <span
        className="text-muted-foreground ml-1 text-xs font-normal"
        style={{ fontSize: 12 }}
      >
        {count}
      </span>
      {(onAddCard || onOpenMenu) && (
        <span
          className={cn(
            "ml-auto flex items-center gap-0.5 transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            aria-label="More group options"
            onClick={onOpenMenu}
            className="text-muted-foreground hover:bg-accent flex h-6 w-6 items-center justify-center rounded transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="New page"
            onClick={onAddCard}
            className="text-muted-foreground hover:bg-accent flex h-6 w-6 items-center justify-center rounded transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  );
};
