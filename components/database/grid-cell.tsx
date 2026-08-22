"use client";

import { useState } from "react";

import { SelectCell } from "./select-cell";
import { CellValue, DatabaseProperty } from "./types";

interface GridTextCellProps {
  value: string;
  editable: boolean;
  isEditing: boolean;
  editSeed: string | null;
  onCommit: (value: string) => void;
}

// `key={value}` kasıtlı: sunucudan gelen otoriter değer değiştiğinde
// (yalnızca kendi commit'imiz round-trip'ten dönünce olur) input'u
// sıfırdan mount eder — prop'tan state'e senkronlamak için effect
// gerekmez, `set-state-in-effect` ihlaline düşülmez.
export const GridTextCell = ({
  value,
  editable,
  isEditing,
  editSeed,
  onCommit,
}: GridTextCellProps) => {
  const [draft, setDraft] = useState(editSeed ?? value);

  return (
    <input
      key={`${value}:${isEditing}:${editSeed ?? ""}`}
      defaultValue={editSeed ?? value}
      readOnly={!editable || !isEditing}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (isEditing && draft !== value) onCommit(draft);
      }}
      autoFocus={isEditing}
      className="text-foreground h-full w-full bg-transparent px-3 py-2 text-sm outline-none"
    />
  );
};

interface DatabaseCellProps {
  property: DatabaseProperty;
  value: CellValue | undefined;
  editable: boolean;
  isActive: boolean;
  isEditing: boolean;
  editSeed: string | null;
  onCommit: (value: CellValue) => void;
  onEditingDone?: () => void;
}

// Tipe göre doğru hücre bileşenini seçer — yeni tip eklendiğinde
// dokunulması gereken tek yer burası.
export const DatabaseCell = ({
  property,
  value,
  editable,
  isActive,
  isEditing,
  editSeed,
  onCommit,
  onEditingDone,
}: DatabaseCellProps) => {
  if (property.type === "select" || property.type === "multiSelect") {
    return (
      <SelectCell
        property={property}
        value={value as string | string[] | null | undefined}
        multiple={property.type === "multiSelect"}
        editable={editable}
        isActive={isActive}
        isEditing={isEditing}
        onCommit={onCommit}
        onEditingDone={onEditingDone}
      />
    );
  }

  return (
    <GridTextCell
      editable={editable}
      isEditing={isEditing}
      editSeed={editSeed}
      value={typeof value === "string" ? value : ""}
      onCommit={onCommit}
    />
  );
};
