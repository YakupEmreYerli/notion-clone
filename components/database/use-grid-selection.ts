"use client";

import { useCallback, useState } from "react";

import { CellValue, DatabaseProperty, DatabaseRow } from "./types";

export interface GridCellPosition {
  rowId: DatabaseRow["_id"];
  propertyId: DatabaseProperty["_id"];
}

interface UseGridSelectionArgs {
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  editable: boolean;
  onClearCell: (position: GridCellPosition, value: CellValue) => void;
}

export const useGridSelection = ({
  properties,
  rows,
  editable,
  onClearCell,
}: UseGridSelectionArgs) => {
  const [activeCell, setActiveCell] = useState<GridCellPosition | null>(null);
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [editSeed, setEditSeed] = useState<string | null>(null);

  const activateCell = useCallback((position: GridCellPosition) => {
    setActiveCell(position);
    setMode("idle");
    setEditSeed(null);
  }, []);

  // select/multiSelect popover'ları kendi seçimlerinde kapanır (bkz.
  // select-cell.tsx) — bu sadece "editing" modundan çıkar, hücreyi değiştirmez.
  const exitEditing = useCallback(() => {
    setMode("idle");
    setEditSeed(null);
  }, []);

  const moveTo = useCallback(
    (rowIndex: number, propertyIndex: number) => {
      const clampedRow = Math.max(0, Math.min(rows.length - 1, rowIndex));
      const clampedProperty = Math.max(
        0,
        Math.min(properties.length - 1, propertyIndex),
      );
      setActiveCell({
        rowId: rows[clampedRow]._id,
        propertyId: properties[clampedProperty]._id,
      });
      setMode("idle");
      setEditSeed(null);
    },
    [properties, rows],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!activeCell || properties.length === 0 || rows.length === 0) return;

      const rowIndex = rows.findIndex((row) => row._id === activeCell.rowId);
      const propertyIndex = properties.findIndex(
        (property) => property._id === activeCell.propertyId,
      );
      if (rowIndex === -1 || propertyIndex === -1) return;

      const isTextCell = properties[propertyIndex].type === "text";

      const tabMove = (shift: boolean) => {
        if (shift) {
          if (propertyIndex === 0) moveTo(rowIndex - 1, properties.length - 1);
          else moveTo(rowIndex, propertyIndex - 1);
        } else if (propertyIndex === properties.length - 1) {
          moveTo(rowIndex + 1, 0);
        } else {
          moveTo(rowIndex, propertyIndex + 1);
        }
      };

      if (mode === "editing") {
        if (event.key === "Escape") {
          event.preventDefault();
          setMode("idle");
          setEditSeed(null);
          return;
        }

        // Enter, cmdk'nin kendi "Enter ile seç" davranışıyla çakışmasın diye
        // sadece text hücrelerinde burada ele alınır — select/multiSelect
        // kendi onToggle/onCreate'i üzerinden kapanır (exitEditing).
        if (event.key === "Enter" && isTextCell) {
          event.preventDefault();
          // Senkron blur, GridTextCell'in onBlur'unu tetikleyip mevcut
          // taslağı hemen commit eder — sonra bir alt satıra geçilir.
          (document.activeElement as HTMLElement | null)?.blur();
          moveTo(rowIndex + 1, propertyIndex);
          return;
        }

        if (event.key === "Tab") {
          event.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          tabMove(event.shiftKey);
          return;
        }

        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveTo(rowIndex - 1, propertyIndex);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveTo(rowIndex + 1, propertyIndex);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveTo(rowIndex, propertyIndex - 1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveTo(rowIndex, propertyIndex + 1);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        tabMove(event.shiftKey);
        return;
      }

      if (event.key === "Enter") {
        if (!editable) return;
        event.preventDefault();
        setMode("editing");
        setEditSeed(null);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!editable) return;
        event.preventDefault();
        onClearCell(activeCell, "");
        return;
      }

      if (
        editable &&
        isTextCell &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setMode("editing");
        setEditSeed(event.key);
      }
    },
    [activeCell, editable, mode, moveTo, onClearCell, properties, rows],
  );

  return {
    activeCell,
    activateCell,
    exitEditing,
    editSeed,
    mode,
    onKeyDown,
  };
};
