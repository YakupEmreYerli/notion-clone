"use client";

import { DatabaseProperty, PropertyType } from "./types";
import { ColumnMenu } from "./column-menu";
import type { SortDirection } from "./view-operations";
import { PropertyIcon } from "./property-icon";

interface ColumnHeaderProps {
  property: DatabaseProperty;
  editable: boolean;
  width: number;
  canDelete: boolean;
  onResizeStart: (event: React.PointerEvent) => void;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onChangeType: (type: PropertyType) => void;
  onFilter: () => void;
  onSort: (direction: SortDirection) => void;
  onHide: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const ColumnHeader = ({
  property,
  editable,
  width,
  canDelete,
  onResizeStart,
  onInsertLeft,
  onInsertRight,
  onChangeType,
  onFilter,
  onSort,
  onHide,
  onDuplicate,
  onDelete,
}: ColumnHeaderProps) => {
  const style: React.CSSProperties = {
    width,
  };

  return (
    <div
      data-testid="database-column-header"
      style={style}
      className="border-border group/col hover:bg-primary/5 text-foreground/80 relative flex h-9 min-h-0 shrink-0 items-center border-r p-0 text-sm font-normal"
    >
      {editable ? (
        <ColumnMenu
          property={property}
          canDelete={canDelete}
          onInsertLeft={onInsertLeft}
          onInsertRight={onInsertRight}
          onChangeType={onChangeType}
          onFilter={onFilter}
          onSort={onSort}
          onHide={onHide}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ) : (
        <span className="flex min-w-0 items-center gap-1.5 px-2">
          <PropertyIcon
            property={property}
            className="text-muted-foreground size-4"
          />
          <span className="truncate">{property.name}</span>
        </span>
      )}
      {editable && (
        <div
          onPointerDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          className="hover:bg-primary/30 absolute top-0 right-0 h-full w-1 cursor-ew-resize opacity-0 hover:opacity-100"
        />
      )}
    </div>
  );
};
