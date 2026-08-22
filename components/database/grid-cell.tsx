"use client";

import { useState } from "react";

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
