"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseGrid } from "./database-grid";
import { DatabaseSkeleton } from "./database-skeleton";
import { ViewSwitcher } from "./board/view-switcher";
import { BoardView } from "./board/board-view";
import { DatabaseToolbar } from "./database-toolbar";
import { DatabaseView as ViewDoc } from "./types";
import {
  applyDatabaseView,
  isFilterEffective,
  parseViewFilters,
  parseViewSorts,
} from "./view-operations";

interface DatabaseViewProps {
  documentId: Id<"documents">;
  editable?: boolean;
}

const DatabaseView = ({ documentId, editable = true }: DatabaseViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchByView, setSearchByView] = useState<Record<string, string>>({});

  const properties = useQuery(api.databases.getSchema, {
    databaseId: documentId,
  });
  const rows = useQuery(api.databases.getRows, { databaseId: documentId });
  const views = useQuery(api.databaseViews.getViews, {
    databaseId: documentId,
  });

  const createView = useMutation(api.databaseViews.createView);

  // Aktif view: URL'deki ?v= (yenilenince korunur); yoksa ilk view.
  const activeViewId = searchParams.get("v") ?? undefined;
  const activeView: ViewDoc | undefined = useMemo(
    () => views?.find((v) => v._id === activeViewId) ?? views?.[0] ?? undefined,
    [views, activeViewId],
  );

  const orderEntries = useQuery(
    api.databaseViews.getViewOrders,
    activeView?.type === "board" && activeView
      ? { viewId: activeView._id }
      : "skip",
  );
  const filters = useMemo(() => {
    const propertyIds = new Set(properties?.map((property) => property._id));
    return parseViewFilters(activeView?.filters).filter((filter) =>
      propertyIds.has(filter.propertyId),
    );
  }, [activeView?.filters, properties]);
  const sorts = useMemo(() => {
    const propertyIds = new Set(properties?.map((property) => property._id));
    return parseViewSorts(activeView?.sorts).filter((sort) =>
      propertyIds.has(sort.propertyId),
    );
  }, [activeView?.sorts, properties]);
  const searchQuery = activeView ? (searchByView[activeView._id] ?? "") : "";
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasActiveFilters = filters.some(isFilterEffective);
  const visibleRows = useMemo(
    () =>
      properties && rows
        ? applyDatabaseView(
            rows,
            properties,
            filters,
            sorts,
            deferredSearchQuery,
          )
        : [],
    [rows, properties, filters, sorts, deferredSearchQuery],
  );
  const visibleTableProperties = (() => {
    if (!properties || activeView?.visiblePropertyIds === undefined) {
      return properties ?? [];
    }
    const byId = new Map(
      properties.map((property) => [property._id, property]),
    );
    return activeView.visiblePropertyIds
      .map((propertyId) => byId.get(propertyId))
      .filter(
        (property): property is NonNullable<typeof property> => !!property,
      );
  })();

  // URL'de geçersiz/stale ?v= varsa ilk view'a geri düş (param yoksa
  // varsayılan zaten ilk view — URL'e dokunma).
  useEffect(() => {
    if (!views || views.length === 0) return;
    const param = searchParams.get("v");
    if (param && !views.some((v) => v._id === param)) {
      router.replace(`?v=${views[0]._id}`, { scroll: false });
    }
  }, [views, searchParams, router]);

  const onSelectView = useCallback(
    (viewId: string) => {
      router.replace(`?v=${viewId}`, { scroll: false });
    },
    [router],
  );

  const onCreateView = useCallback(
    (type: "table" | "board") => {
      if (!views || views.length === 0) return;
      createView({
        databaseId: documentId,
        type,
        afterViewId: views[views.length - 1]._id,
      }).then((id) => onSelectView(id));
    },
    [views, createView, documentId, onSelectView],
  );

  if (properties === undefined || rows === undefined || views === undefined) {
    return <DatabaseSkeleton />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 md:flex-nowrap">
        <ViewSwitcher
          views={views}
          activeViewId={activeView?._id}
          onSelect={onSelectView}
          onCreate={onCreateView}
          editable={editable}
        />
        {activeView && (
          <DatabaseToolbar
            databaseId={documentId}
            view={activeView}
            properties={properties}
            rows={rows}
            orders={orderEntries ?? []}
            filters={filters}
            sorts={sorts}
            searchQuery={searchQuery}
            onSearchChange={(query) =>
              setSearchByView((current) => ({
                ...current,
                [activeView._id]: query,
              }))
            }
            editable={editable}
          />
        )}
      </div>
      {activeView?.type === "board" ? (
        <BoardView
          key={activeView._id}
          view={activeView}
          databaseId={documentId}
          properties={properties}
          rows={visibleRows}
          orders={orderEntries ?? []}
          totalRowCount={rows.length}
          preserveRowOrder={sorts.length > 0}
          disableRowReordering={
            hasActiveFilters ||
            sorts.length > 0 ||
            deferredSearchQuery.trim().length > 0
          }
          editable={editable}
        />
      ) : activeView ? (
        <DatabaseGrid
          databaseId={documentId}
          view={activeView}
          allProperties={properties}
          properties={visibleTableProperties}
          rows={visibleRows}
          filters={filters}
          sorts={sorts}
          lastRowId={rows[rows.length - 1]?._id}
          rowReorderingEnabled={
            !hasActiveFilters &&
            sorts.length === 0 &&
            deferredSearchQuery.trim().length === 0
          }
          editable={editable}
        />
      ) : null}
    </div>
  );
};

export default DatabaseView;
