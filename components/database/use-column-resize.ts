"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseProperty } from "./types";

const MIN_WIDTH = 100;
const DEFAULT_WIDTH = 180;

// Genişlik state'i burada, tek yerde tutulur: başlık VE her satır aynı
// gridTemplateColumns string'ini paylaştığı için sürüklerken ikisinin de
// aynı anda güncellenmesi gerekir — sadece ColumnHeader'ın kendi local
// state'i olsaydı gövde sütunları geride kalırdı.
export function useColumnResize() {
  const setPropertyWidth = useMutation(api.databases.setPropertyWidth);
  const [overrides, setOverrides] = useState<
    Record<Id<"databaseProperties">, number>
  >({});
  const dragRef = useRef({ startX: 0, startWidth: 0, propertyId: "" as Id<"databaseProperties"> });

  const getWidth = useCallback(
    (property: DatabaseProperty) =>
      overrides[property._id] ?? property.width ?? DEFAULT_WIDTH,
    [overrides],
  );

  const startResize = useCallback(
    (property: DatabaseProperty, event: React.PointerEvent) => {
      event.stopPropagation();
      event.preventDefault();

      dragRef.current = {
        startX: event.clientX,
        startWidth: overrides[property._id] ?? property.width ?? DEFAULT_WIDTH,
        propertyId: property._id,
      };

      const onMove = (moveEvent: PointerEvent) => {
        const { startX, startWidth, propertyId } = dragRef.current;
        const next = Math.max(MIN_WIDTH, startWidth + (moveEvent.clientX - startX));
        setOverrides((prev) => ({ ...prev, [propertyId]: next }));
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        setOverrides((prev) => {
          const finalWidth = prev[dragRef.current.propertyId];
          if (finalWidth !== undefined) {
            setPropertyWidth({
              propertyId: dragRef.current.propertyId,
              width: finalWidth,
            });
          }
          return prev;
        });
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [overrides, setPropertyWidth],
  );

  return { getWidth, startResize };
}
