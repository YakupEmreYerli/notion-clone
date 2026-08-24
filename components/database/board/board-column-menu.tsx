"use client";

import { useMutation } from "convex/react";
import { EyeOff, Palette, Settings2 } from "lucide-react";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { api } from "@/convex/_generated/api";
import { DatabaseProperty } from "@/components/database/types";
import { OPTION_COLORS } from "@/components/database/colors";
import { cn } from "@/lib/utils";

// Kolon ⋯ menüsü — Notion'dan ölçülen öğeler: Edit groups / Hide group /
// Colors (grup rengi değiştir). "Move to Trash" bilinçli kapsam dışı:
// satırlar tabloyla paylaşılan veri; silme tablo satır menüsünde mevcut.
interface BoardColumnMenuProps {
  open: boolean;
  x: number;
  y: number;
  groupKey: string;
  /** Renk değişimi için: grup key'i bir select option id ise property bulunur. */
  groupByProperty?: DatabaseProperty;
  onClose: () => void;
  onEditGroups: () => void;
  onHideGroup: () => void;
}

export const BoardColumnMenu = ({
  open,
  x,
  y,
  groupKey,
  groupByProperty,
  onClose,
  onEditGroups,
  onHideGroup,
}: BoardColumnMenuProps) => {
  const updateOption = useMutation(api.databases.updateSelectOption);

  const option = groupByProperty?.options?.find((o) => o.id === groupKey);
  const canRecolor = !!groupByProperty && !!option;

  const changeColor = (color: string) => {
    if (!groupByProperty || !option) return;
    updateOption({
      propertyId: groupByProperty._id,
      optionId: option.id,
      color,
    });
  };

  return (
    <ContextMenu open={open} x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        icon={<Settings2 />}
        label="Edit groups"
        onClick={() => {
          onEditGroups();
          onClose();
        }}
      />
      <ContextMenuItem
        icon={<EyeOff />}
        label="Hide group"
        onClick={() => {
          onHideGroup();
          onClose();
        }}
      />
      {canRecolor && (
        <>
          <ContextMenuSeparator />
          <ContextMenuLabel>Colors</ContextMenuLabel>
          <div className="flex flex-wrap gap-1 px-2 py-1">
            {OPTION_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                title={color}
                onClick={() => changeColor(color)}
                className={cn(
                  "h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110",
                  option?.color === color &&
                    "ring-2 ring-[var(--ring)] ring-offset-1",
                )}
                style={{
                  backgroundColor: `var(--kanban-${color}-badge-bg)`,
                }}
              />
            ))}
          </div>
        </>
      )}
    </ContextMenu>
  );
};
