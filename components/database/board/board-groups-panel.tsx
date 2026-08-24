"use client";

import { useMutation } from "convex/react";
import { Eye, EyeOff, ListFilter } from "lucide-react";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { api } from "@/convex/_generated/api";
import { DatabaseProperty, DatabaseView } from "@/components/database/types";
import { GROUPABLE_TYPES } from "@/components/database/property-types";
import { BoardGroup } from "./grouping";
import { groupColorVars } from "./board-colors";
import { cn } from "@/lib/utils";

export interface HiddenGroupInfo {
  key: string;
  label: string;
  color?: string;
}

// "Edit groups" paneli — Notion'dan ölçülen davranış: görünür/gizli grup
// listeleri (Show/Hide), "Group by" seçici ve "Hide empty groups" toggle'ı.
// Kolon sırası (drag) bu panelde yapılır; sürükleme Faz 6'da eklenir.
interface BoardGroupsPanelProps {
  open: boolean;
  x: number;
  y: number;
  view: DatabaseView;
  properties: DatabaseProperty[];
  groups: BoardGroup[];
  hiddenGroups: HiddenGroupInfo[];
  onClose: () => void;
}

export const BoardGroupsPanel = ({
  open,
  x,
  y,
  view,
  properties,
  groups,
  hiddenGroups,
  onClose,
}: BoardGroupsPanelProps) => {
  const updateSettings = useMutation(api.databaseViews.updateViewSettings);
  const setGroupBy = useMutation(api.databaseViews.setGroupByProperty);

  const hiddenKeys = new Set(view.hiddenGroupKeys ?? []);
  const groupable = properties.filter((p) => GROUPABLE_TYPES.includes(p.type));
  const groupBy = view.groupByPropertyId
    ? properties.find((p) => p._id === view.groupByPropertyId)
    : undefined;

  const setHidden = (keys: string[]) =>
    updateSettings({ viewId: view._id, hiddenGroupKeys: keys });

  return (
    <ContextMenu open={open} x={x} y={y} onClose={onClose} className="w-[300px]">
      <ContextMenuLabel>Group by</ContextMenuLabel>
      {groupable.map((property) => (
        <ContextMenuItem
          key={property._id}
          label={property.name}
          disabled={property._id === view.groupByPropertyId}
          icon={
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: "var(--kanban-gray-badge-bg)" }}
            />
          }
          onClick={() => setGroupBy({ viewId: view._id, propertyId: property._id })}
        />
      ))}
      <ContextMenuSeparator />
      <ContextMenuLabel>Visible groups</ContextMenuLabel>
      {groups.map((group) => (
        <div
          key={group.key}
          className="flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-[14px] hover:bg-accent"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: groupColorVars(group.color).badgeBg }}
          />
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <span className="text-xs text-muted-foreground/70">
            {group.rows.length}
          </span>
          <button
            type="button"
            aria-label={`Hide group ${group.label}`}
            onClick={() => setHidden([...hiddenKeys, group.key])}
            className="text-muted-foreground hover:bg-secondary flex h-6 w-6 items-center justify-center rounded"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <ContextMenuSeparator />
      <ContextMenuLabel>Hidden groups</ContextMenuLabel>
      {hiddenKeys.size === 0 && (
        <div className="px-3 py-1 text-xs text-muted-foreground/60">
          No hidden groups
        </div>
      )}
      {hiddenGroups.map((group) => (
        <div
          key={group.key}
          className="flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-[14px] opacity-60 hover:bg-accent"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: groupColorVars(group.color).badgeBg }}
          />
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <button
            type="button"
            aria-label={`Show group ${group.label}`}
            onClick={() =>
              setHidden([...hiddenKeys].filter((k) => k !== group.key))
            }
            className="text-muted-foreground hover:bg-secondary flex h-6 w-6 items-center justify-center rounded"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <ContextMenuSeparator />
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between rounded-md px-2 text-sm hover:bg-accent"
        onClick={() =>
          updateSettings({
            viewId: view._id,
            hideEmptyGroups: !view.hideEmptyGroups,
          })
        }
      >
        <span className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          Hide empty groups
        </span>
        <span
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            view.hideEmptyGroups ? "bg-[var(--ring)]" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
              view.hideEmptyGroups ? "left-3.5" : "left-0.5",
            )}
          />
        </span>
      </button>
    </ContextMenu>
  );
};