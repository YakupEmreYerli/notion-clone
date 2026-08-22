"use client";

import { useMutation } from "convex/react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type SortableItemData = {
  parentDocument?: Id<"documents">;
  order?: number;
  siblingIndex: number;
};

type SortableOverData = {
  parentDocument?: Id<"documents">;
  siblingIndex: number;
  sortable?: { containerId: string; index: number };
};

/**
 * Sidebar sayfa ağacındaki TÜM seviyeler için tek, ortak sürükle-bırak
 * mantığı. Notion'da doğrulanan iki davranışı ayırt eder:
 *  - Bir satırın üst/alt kenarına bırakmak  -> o satırın ebeveyni altında
 *    SIRALAMA (reorder) — aynı seviyede kalsa da farklı bir ebeveyne geçse de.
 *  - Bir satırın ORTASINA bırakmak          -> o satırın KENDİSİ yeni ebeveyn
 *    olur (nest/reparent) — sidebar'da Notion'daki "Moved X to Y" tostuna
 *    karşılık gelen bir bildirim + Undo ile.
 * Ayrım, dnd-kit'in zaten hesapladığı `over` dikdörtgeni içindeki dikey
 * imleç konumundan (üst/alt %30 = sıralama, orta %40 = nest) çıkarılır —
 * ekstra bir droppable/registry gerektirmez.
 */
export const useSidebarDragAndDrop = () => {
  const update = useMutation(api.documents.update);
  const reorder = useMutation(api.documents.reorder);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragStart = (_event: DragStartEvent) => {
    document.body.classList.add("cursor-grabbing");
  };

  const restoreParent = (
    id: Id<"documents">,
    previousParent: Id<"documents"> | undefined,
    previousOrder: number | undefined,
  ) => {
    const reparent = previousParent
      ? update({ id, parentDocument: previousParent })
      : update({ id, unparent: true });

    reparent.then(() => {
      if (previousOrder !== undefined) {
        reorder({
          id,
          parentDocument: previousParent,
          newOrder: previousOrder,
        });
      }
    });
  };

  const moveAcrossParents = (
    id: Id<"documents">,
    newParentId: Id<"documents"> | undefined,
    newOrder: number,
    previousParent: Id<"documents"> | undefined,
    previousOrder: number | undefined,
  ) => {
    const reparent = newParentId
      ? update({ id, parentDocument: newParentId })
      : update({ id, unparent: true });

    const promise = reparent.then(() =>
      reorder({ id, parentDocument: newParentId, newOrder }),
    );

    toast.promise(promise, {
      loading: "Moving page...",
      error: (error) =>
        error instanceof Error ? error.message : "Failed to move page.",
    });

    promise
      .then(() => {
        toast("Page moved", {
          action: {
            label: "Undo",
            onClick: () => restoreParent(id, previousParent, previousOrder),
          },
        });
      })
      .catch(() => {
        // toast.promise zaten hatayı gösterdi; burada sessizce yut.
      });
  };

  const onDragEnd = (event: DragEndEvent) => {
    document.body.classList.remove("cursor-grabbing");

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as Id<"documents">;
    const overId = over.id as Id<"documents">;

    const activeData = active.data.current as SortableItemData | undefined;
    const overData = over.data.current as SortableOverData | undefined;
    const overSortable = overData?.sortable;
    if (!overSortable) return;

    const previousParent = activeData?.parentDocument;
    const previousOrder = activeData?.order;

    const activeRect =
      active.rect.current.translated ?? active.rect.current.initial;
    const overRect = over.rect;

    let isNest = false;
    let relative = 0.5;
    if (activeRect && overRect && overRect.height > 0) {
      const activeCenterY = activeRect.top + activeRect.height / 2;
      relative = (activeCenterY - overRect.top) / overRect.height;
      isNest = relative > 0.3 && relative < 0.7;
    }

    if (isNest) {
      // Bırakılan satırın kendisi yeni ebeveyn olur. Döngü/soy kontrolü
      // `documents.update` mutation'ında (assertValidReparent) yapılır —
      // burada sadece çağırıp hatayı toast ile yüzeye çıkarıyoruz.
      moveAcrossParents(activeId, overId, 0, previousParent, previousOrder);
      return;
    }

    const newParentId = overData?.parentDocument;
    if (overData?.siblingIndex === undefined) return;
    let newIndex = overData.siblingIndex;
    if (relative >= 0.7) newIndex += 1;

    // `reorder` öğeyi listeden çıkardıktan sonra eklediği için, aynı listede
    // aşağı doğru taşınan öğede hedef index bir azalır.
    if (
      previousParent === newParentId &&
      activeData &&
      activeData.siblingIndex < newIndex
    ) {
      newIndex -= 1;
    }

    if (previousParent === newParentId) {
      // Aynı ebeveyn grubu içinde basit sıralama — Notion'da toast
      // göstermeyen sıradan reorder davranışıyla birebir aynı.
      reorder({
        id: activeId,
        parentDocument: newParentId,
        newOrder: newIndex,
      });
      return;
    }

    moveAcrossParents(
      activeId,
      newParentId,
      newIndex,
      previousParent,
      previousOrder,
    );
  };

  return { sensors, onDragStart, onDragEnd };
};
