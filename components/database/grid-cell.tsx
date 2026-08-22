"use client";

import { useState } from "react";

import { SelectCell } from "./select-cell";
import { CellValue, DatabaseProperty } from "./types";

interface GridTextCellProps {
  value: string;
  editable: boolean;
  onCommit: (value: string) => void;
}

// `key={value}` kasıtlı: sunucudan gelen otoriter değer değiştiğinde
// (yalnızca kendi commit'imiz round-trip'ten dönünce olur) input'u
// sıfırdan mount eder — prop'tan state'e senkronlamak için effect
// gerekmez, `set-state-in-effect` ihlaline düşülmez.
export const GridTextCell = ({
  value,
  editable,
  onCommit,
}: GridTextCellProps) => {
  const [draft, setDraft] = useState(value);

  return (
    <input
      key={value}
      defaultValue={value}
      readOnly={!editable}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className="text-foreground h-full w-full bg-transparent px-3 py-2 text-sm outline-none"
    />
  );
};

interface DatabaseCellProps {
  property: DatabaseProperty;
  value: CellValue | undefined;
  editable: boolean;
  onCommit: (value: CellValue) => void;
}

// Tipe göre doğru hücre bileşenini seçer — yeni tip eklendiğinde
// dokunulması gereken tek yer burası.
export const DatabaseCell = ({
  property,
  value,
  editable,
  onCommit,
}: DatabaseCellProps) => {
  if (property.type === "select" || property.type === "multiSelect") {
    return (
      <SelectCell
        property={property}
        value={value as string | string[] | null | undefined}
        multiple={property.type === "multiSelect"}
        editable={editable}
        onCommit={onCommit}
      />
    );
  }

  return (
    <GridTextCell
      editable={editable}
      value={typeof value === "string" ? value : ""}
      onCommit={onCommit}
    />
  );
};
