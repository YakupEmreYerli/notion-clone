"use client";

import { useCallback, useState } from "react";

import { CellValue, DatabaseProperty, DatabaseRow } from "./types";

export interface GridCellPosition {
  rowId: DatabaseRow["_id"];
  propertyId: DatabaseProperty["_id"];
}

// Aktif hücre + fill hedef aralığı. Text hücresine tıklandığında Notion'daki
// gibi köşe tutamacından aşağı sürüklenerek değer alt satırlara kopyalanır.
export interface FillSelection {
  rowId: DatabaseRow["_id"];
  propertyId: DatabaseProperty["_id"];
  /** Sürükleme sırasında hedefe alınan son satır id'si. */
  targetRowId: DatabaseRow["_id"];
}

/**
 * Kaynaktan hedefe (yön ne olursa olsun) düşen satırları döndürür. Notion fill
 * tutamacı hem yukarı hem aşağı sürdürülebildiği için sıra normalize edilir.
 * Kimlikler bulunamazsa null.
 */
export function getFillRange(
  rows: DatabaseRow[],
  selection: FillSelection,
): DatabaseRow[] | null {
  const startIndex = rows.findIndex((row) => row._id === selection.rowId);
  const endIndex = rows.findIndex((row) => row._id === selection.targetRowId);
  if (startIndex === -1 || endIndex === -1) return null;
  const [from, to] = [startIndex, endIndex].sort((a, b) => a - b);
  return rows.slice(from, to + 1);
}

interface UseGridSelectionArgs {
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  editable: boolean;
  onClearCell: (position: GridCellPosition, value: CellValue) => void;
  /** Notion fill: Ctrl/⌘+D ile aktif hücrenin değerini seçili aralığa kopyalar. */
  onFill?: (position: GridCellPosition, targetRowIds: DatabaseRow["_id"][]) => void;
}

export const useGridSelection = ({
  properties,
  rows,
  editable,
  onClearCell,
  onFill,
}: UseGridSelectionArgs) => {
  const [activeCell, setActiveCell] = useState<GridCellPosition | null>(null);
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [editSeed, setEditSeed] = useState<string | null>(null);
  const [fill, setFill] = useState<FillSelection | null>(null);

  const activateCell = useCallback((position: GridCellPosition) => {
    setActiveCell(position);
    setMode("idle");
    setEditSeed(null);
    setFill(null);
  }, []);

  // Notion davranışı: hücreye tıklayınca (özellikle text) doğrudan düzenleme
  // moduna girer — böylece içine tıklanıp yazı ya da Ctrl+V yapıştırılabilir.
  // "idle" modda input readOnly kaldığı için yapıştırma çalışmıyordu.
  const beginEditCell = useCallback(
    (position: GridCellPosition) => {
      // Zaten düzenlenen hücreye tekrar tıklamak (imleci taşımak için) state'i
      // sıfırlamamalı. `setEditSeed(null)` GridTextCell'in `key`'ini
      // değiştirir, input remount olur ve o ana kadar yazılan taslak gider.
      if (
        mode === "editing" &&
        activeCell?.rowId === position.rowId &&
        activeCell.propertyId === position.propertyId
      ) {
        return;
      }
      setActiveCell(position);
      setMode("editing");
      setEditSeed(null);
      setFill(null);
    },
    [activeCell, mode],
  );

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
      setFill(null);
    },
    [properties, rows],
  );

  // Notion fill tutamacı: bir text hücresinden başlayıp aşağı sürüklenen
  // hedef satırların listesini (kaynaktan hedefe) döndürür.
  const getFillRangeFor = useCallback(
    (selection: FillSelection) => getFillRange(rows, selection),
    [rows],
  );

  const startFill = useCallback(
    (position: GridCellPosition) => {
      setActiveCell(position);
      setMode("idle");
      setEditSeed(null);
      setFill({ ...position, targetRowId: position.rowId });
    },
    [],
  );

  const updateFillTarget = useCallback((targetRowId: DatabaseRow["_id"]) => {
    setFill((prev) => (prev ? { ...prev, targetRowId } : prev));
  }, []);

  const endFill = useCallback(() => {
    setFill(null);
  }, []);

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
          setFill(null);
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

      // Notion fill kısayolu: Ctrl/⌘+D, seçili hücrenin değerini aşağıdaki
      // satırlara kopyalar. Burada "aşağıdaki" = aktif hücreden sona kadar.
      if (
        editable &&
        isTextCell &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        const targetRowIds = rows
          .slice(rowIndex + 1)
          .map((row) => row._id);
        if (targetRowIds.length > 0) onFill?.(activeCell, targetRowIds);
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
    [activeCell, editable, mode, moveTo, onClearCell, onFill, properties, rows],
  );

  return {
    activeCell,
    activateCell,
    beginEditCell,
    exitEditing,
    editSeed,
    mode,
    onKeyDown,
    fill,
    startFill,
    updateFillTarget,
    endFill,
    getFillRange: getFillRangeFor,
  };
};
