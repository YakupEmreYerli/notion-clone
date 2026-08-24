"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Copy, LayoutPanelLeft, Pencil, Plus, Rows3, Trash } from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DatabaseView } from "@/components/database/types";
import { cn } from "@/lib/utils";

// View switcher sekmeleri. Aktif view ?v=<id> ile adreslenir; tıklama
// history.replaceState ile URL'i günceller (reload'da view korunur).
// Sağ tıklama menüsü (Notion'dan ölçülen): Rename / Duplicate / Delete /
// Copy link to view — son view silinemez, silme hatası toast ile döner.
interface ViewSwitcherProps {
  views: DatabaseView[];
  activeViewId?: string;
  onSelect: (viewId: string) => void;
  onCreate: (type: "table" | "board") => void;
  editable?: boolean;
}

const VIEW_ICON = {
  table: Rows3,
  board: LayoutPanelLeft,
} as const;

export const ViewSwitcher = ({
  views,
  activeViewId,
  onSelect,
  onCreate,
  editable = true,
}: ViewSwitcherProps) => {
  const renameView = useMutation(api.databaseViews.renameView);
  const duplicateView = useMutation(api.databaseViews.duplicateView);
  const deleteView = useMutation(api.databaseViews.deleteView);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ viewId: Id<"databaseViews">; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = (view: DatabaseView) => {
    const name = inputRef.current?.value.trim();
    setRenamingId(null);
    if (name && name !== view.name) {
      renameView({ viewId: view._id, name });
    }
  };

  const onDuplicate = async (viewId: Id<"databaseViews">) => {
    const copyId = await duplicateView({ viewId });
    onSelect(copyId);
  };

  const onDelete = async (viewId: Id<"databaseViews">) => {
    try {
      await deleteView({ viewId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "View could not be deleted");
    }
  };

  const onCopyLink = async (viewId: Id<"databaseViews">) => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", viewId);
    await navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="flex items-center gap-0.5">
      {views.map((view) => {
        const Icon = VIEW_ICON[view.type] ?? Rows3;
        const active = view._id === activeViewId;
        const renaming = renamingId === view._id;

        if (renaming) {
          return (
            <input
              key={view._id}
              ref={inputRef}
              defaultValue={view.name}
              autoFocus
              onBlur={() => commitRename(view)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitRename(view);
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="bg-secondary text-foreground h-8 w-32 rounded-md px-2 text-sm outline-none"
            />
          );
        }

        return (
          <button
            key={view._id}
            type="button"
            onClick={() => onSelect(view._id)}
            onDoubleClick={() => editable && setRenamingId(view._id)}
            onContextMenu={(e) => {
              if (!editable) return;
              e.preventDefault();
              setMenu({ viewId: view._id, x: e.clientX, y: e.clientY });
            }}
            className={cn(
              "text-foreground/80 hover:bg-secondary flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active && "bg-secondary text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="truncate">{view.name}</span>
          </button>
        );
      })}

      <ContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        onClose={() => setMenu(null)}
      >
        {menu && (
          <>
            <ContextMenuItem
              icon={<Pencil />}
              label="Rename"
              onClick={() => {
                setRenamingId(menu.viewId);
                setMenu(null);
              }}
            />
            <ContextMenuItem
              icon={<Copy />}
              label="Duplicate"
              onClick={() => {
                onDuplicate(menu.viewId);
                setMenu(null);
              }}
            />
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={<Copy />}
              label="Copy link to view"
              onClick={() => {
                onCopyLink(menu.viewId);
                setMenu(null);
              }}
            />
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={<Trash />}
              label="Delete"
              danger
              disabled={views.length <= 1}
              onClick={() => {
                onDelete(menu.viewId);
                setMenu(null);
              }}
            />
          </>
        )}
      </ContextMenu>

      {editable && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Add view"
            className="text-muted-foreground hover:bg-secondary flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={() => onCreate("table")}>
            <Rows3 className="mr-2 h-4 w-4" />
            Table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("board")}>
            <LayoutPanelLeft className="mr-2 h-4 w-4" />
            Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </div>
  );
};