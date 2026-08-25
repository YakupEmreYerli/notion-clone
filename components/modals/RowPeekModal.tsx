"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useRowPeek } from "@/hooks/useRowPeek";
import { useCoverImage } from "@/hooks/useCoverImage";
import { RowPeekPanel } from "@/components/database/row-peek-panel";

// Row peek — board kartına tıklayınca satırın property'lerini düzenleyen side
// panel. Burası yalnızca veri katmanı; görünüm `RowPeekPanel`'de (prop alır,
// böylece fixture'da test edilebilir).
export const RowPeekModal = () => {
  const peek = useRowPeek();
  const updateCell = useMutation(api.databases.updateCell);
  const setRowIcon = useMutation(api.databases.setRowIcon);
  const createProperty = useMutation(api.databases.createProperty);
  const renameProperty = useMutation(api.databases.renameProperty);
  const changePropertyType = useMutation(api.databases.changePropertyType);
  const duplicateProperty = useMutation(api.databases.duplicateProperty);
  const deleteProperty = useMutation(api.databases.deleteProperty);
  const setRowCover = useMutation(api.databases.setRowCover);
  const coverImage = useCoverImage();

  const properties = useQuery(
    api.databases.getSchema,
    peek.databaseId ? { databaseId: peek.databaseId } : "skip",
  );
  const rows = useQuery(
    api.databases.getRows,
    peek.databaseId ? { databaseId: peek.databaseId } : "skip",
  );
  const row = rows?.find((r) => r._id === peek.rowId);

  return (
    <RowPeekPanel
      open={!!peek.rowId}
      row={row}
      properties={properties}
      onClose={peek.onClose}
      onIconChange={(icon) => row && setRowIcon({ rowId: row._id, icon })}
      onAddCover={() =>
        row && coverImage.onOpenRow(row._id, row.coverImage ?? undefined)
      }
      onRemoveCover={() =>
        row &&
        setRowCover({ rowId: row._id, coverImage: undefined }).catch(() =>
          toast.error("Cover could not be removed"),
        )
      }
      propertyActions={{
        rename: (propertyId, name) =>
          renameProperty({ propertyId: propertyId as never, name }),
        changeType: (propertyId, type) =>
          changePropertyType({ propertyId: propertyId as never, type }),
        duplicate: (propertyId) =>
          duplicateProperty({ propertyId: propertyId as never }).catch(() =>
            toast.error("Property could not be duplicated"),
          ),
        remove: (propertyId) =>
          deleteProperty({ propertyId: propertyId as never }).catch(() =>
            toast.error("Property could not be deleted"),
          ),
      }}
      onAddProperty={() =>
        peek.databaseId &&
        createProperty({
          databaseId: peek.databaseId,
          type: "text",
          afterPropertyId: properties?.[properties.length - 1]?._id,
        })
      }
      onCommit={(propertyId, value) => {
        if (!row) return;
        updateCell({
          rowId: row._id,
          propertyId: propertyId as never,
          value: value as never,
        });
      }}
    />
  );
};
