"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronDown, LayoutPanelLeft, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildGroups } from "./board/grouping";
import { DatabaseFilterMenu } from "./database-filter-menu";
import { DatabaseSortMenu } from "./database-sort-menu";
import { SearchIcon, SettingsIcon } from "./database-toolbar-icons";
import { GROUPABLE_TYPES, PROPERTY_TYPE_OPTIONS } from "./property-types";
import { PropertyIcon } from "./property-icon";
import type {
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
  ViewCardOrder,
} from "./types";
import type { DatabaseFilter, DatabaseSort } from "./view-operations";

interface DatabaseToolbarProps {
  databaseId: Id<"documents">;
  view: DatabaseView;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  orders: ViewCardOrder[];
  filters: DatabaseFilter[];
  sorts: DatabaseSort[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Ayar paneli kontrollü — view menüsündeki "Edit view" de bunu açıyor. */
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  editable?: boolean;
}

interface ViewSettingsPatch {
  filters?: DatabaseFilter[];
  sorts?: DatabaseSort[];
  visiblePropertyIds?: Id<"databaseProperties">[];
  hideEmptyGroups?: boolean;
}

export function DatabaseToolbar({
  databaseId,
  view,
  properties,
  rows,
  orders,
  filters,
  sorts,
  searchQuery,
  onSearchChange,
  editable = true,
  settingsOpen,
  onSettingsOpenChange,
}: DatabaseToolbarProps) {
  const updateSettings = useMutation(api.databaseViews.updateViewSettings);
  const setGroupBy = useMutation(api.databaseViews.setGroupByProperty);
  const createRow = useMutation(api.databases.createRow);
  const createRowInView = useMutation(api.databaseViews.createRowInView);
  const [searchOpen, setSearchOpen] = useState(false);
  // Ayar paneli KONTROLLÜ: view menüsündeki "Edit view" de buradan açıyor.
  // (bkz. database-view.tsx — state orada, iki tetikleyici paylaşıyor.)
  const [optimisticFilters, setOptimisticFilters] = useOptimistic(filters);
  const [optimisticSorts, setOptimisticSorts] = useOptimistic(sorts);

  const groupProperty = view.groupByPropertyId
    ? properties.find((property) => property._id === view.groupByPropertyId)
    : undefined;
  const groupable = properties.filter((property) =>
    GROUPABLE_TYPES.includes(property.type),
  );
  const settingsProperties =
    view.type === "board"
      ? properties.filter((property) => !property.isTitle)
      : properties;
  const defaultVisibleIds = settingsProperties.map((property) => property._id);
  const visibleIds =
    view.type === "board"
      ? view.visiblePropertyIds && view.visiblePropertyIds.length > 0
        ? view.visiblePropertyIds
        : defaultVisibleIds
      : (view.visiblePropertyIds ?? defaultVisibleIds);
  const groups = useMemo(
    () =>
      view.type === "board"
        ? buildGroups({
            rows,
            property: groupProperty,
            orders,
            groupOrder: view.groupOrder,
            hiddenGroupKeys: view.hiddenGroupKeys,
            hideEmptyGroups: view.hideEmptyGroups,
          })
        : [],
    [
      view.type,
      view.groupOrder,
      view.hiddenGroupKeys,
      view.hideEmptyGroups,
      rows,
      groupProperty,
      orders,
    ],
  );

  const saveSettings = (patch: ViewSettingsPatch) =>
    updateSettings({ viewId: view._id, ...patch }).catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "View settings could not be saved",
      );
    });

  const saveFilters = (next: DatabaseFilter[]) => {
    startTransition(async () => {
      setOptimisticFilters(next);
      await saveSettings({ filters: next });
    });
  };

  const saveSorts = (next: DatabaseSort[]) => {
    startTransition(async () => {
      setOptimisticSorts(next);
      await saveSettings({ sorts: next });
    });
  };

  const toggleProperty = (propertyId: DatabaseProperty["_id"]) => {
    const next = visibleIds.includes(propertyId)
      ? visibleIds.filter((id) => id !== propertyId)
      : [...visibleIds, propertyId];
    saveSettings({ visiblePropertyIds: next });
  };

  const createPage = () => {
    if (view.type === "board") {
      const group = groups[0];
      if (!group) return;
      createRowInView({
        viewId: view._id,
        groupKey: group.key,
        title: "",
        afterRowId: group.rows[group.rows.length - 1]?._id,
      }).catch(() => toast.error("Page could not be created"));
      return;
    }
    createRow({
      databaseId,
      afterRowId: rows[rows.length - 1]?._id,
    }).catch(() => toast.error("Row could not be created"));
  };

  return (
    <div className="ml-auto flex w-full min-w-0 shrink-0 items-center justify-end md:w-auto">
      <DatabaseFilterMenu
        properties={properties}
        filters={optimisticFilters}
        editable={editable}
        onChange={saveFilters}
      />
      <DatabaseSortMenu
        properties={properties}
        sorts={optimisticSorts}
        editable={editable}
        onChange={saveSorts}
      />

      <div className="flex h-7 min-w-0 items-center">
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className={`text-muted-foreground hover:bg-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${searchOpen ? "bg-secondary/60" : ""}`}
        >
          <SearchIcon />
        </button>
        {searchOpen && (
          <div className="flex h-7 w-[150px] items-center">
            <input
              autoFocus
              aria-label="Search database"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onSearchChange("");
                  setSearchOpen(false);
                }
              }}
              placeholder="Type to search..."
              className="h-7 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                onSearchChange("");
                setSearchOpen(false);
              }}
              className="text-muted-foreground hover:bg-secondary flex h-6 w-6 shrink-0 items-center justify-center rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <DropdownMenu open={settingsOpen} onOpenChange={onSettingsOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Settings"
            className="text-muted-foreground hover:bg-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          >
            <SettingsIcon />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="px-2 py-1.5 text-sm font-medium">
            {view.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="justify-between">
            <span className="flex items-center gap-2">
              <LayoutPanelLeft className="h-4 w-4" />
              Layout
            </span>
            <span className="text-muted-foreground text-xs capitalize">
              {view.type}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="flex-1">Property visibility</span>
              <span className="text-muted-foreground mr-2 text-xs">
                {visibleIds.length}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <DropdownMenuLabel>Properties</DropdownMenuLabel>
              {settingsProperties.map((property) => (
                <DropdownMenuCheckboxItem
                  key={property._id}
                  checked={visibleIds.includes(property._id)}
                  disabled={!editable}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => toggleProperty(property._id)}
                >
                  {property.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {view.type === "board" && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="flex-1">Group</span>
                <span className="text-muted-foreground mr-2 max-w-28 truncate text-xs">
                  {groupProperty?.name ?? "None"}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-72">
                <DropdownMenuLabel>Group</DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span className="flex-1">Group by</span>
                    <span className="text-muted-foreground mr-2 max-w-28 truncate text-xs">
                      {groupProperty?.name ?? "None"}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64">
                    <DropdownMenuLabel>Group by</DropdownMenuLabel>
                    {groupable.map((property) => {
                      const type = PROPERTY_TYPE_OPTIONS.find(
                        (option) => option.type === property.type,
                      );
                      return (
                        <DropdownMenuItem
                          key={property._id}
                          disabled={
                            !editable || property._id === view.groupByPropertyId
                          }
                          onClick={() =>
                            setGroupBy({
                              viewId: view._id,
                              propertyId: property._id,
                            })
                          }
                        >
                          <PropertyIcon
                            property={property}
                            className="mr-2 size-4"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {property.name}
                          </span>
                          {type && (
                            <span className="text-muted-foreground text-xs">
                              {type.label}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuCheckboxItem
                  checked={view.hideEmptyGroups ?? false}
                  disabled={!editable}
                  onCheckedChange={(checked) =>
                    saveSettings({ hideEmptyGroups: checked === true })
                  }
                >
                  Hide empty groups
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {editable && (
        <div className="ml-1 flex h-7 shrink-0 overflow-hidden rounded-md bg-[#2383e2] text-white">
          <button
            type="button"
            onClick={createPage}
            className="px-3 text-sm font-medium hover:bg-white/10"
          >
            New
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More add options"
                className="flex w-6 items-center justify-center border-l border-white/20 hover:bg-white/10"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={createPage}>New page</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
