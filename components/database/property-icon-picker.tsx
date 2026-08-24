"use client";

import { useState } from "react";
import { Search, Shuffle } from "lucide-react";

import { PROPERTY_ICONS, type PropertyIconId } from "@/lib/property-icons";
import { PropertyIconGlyph } from "./property-icon";

interface PropertyIconPickerProps {
  value?: string;
  onChange: (icon: PropertyIconId | null) => void;
}

export function PropertyIconPicker({
  value,
  onChange,
}: PropertyIconPickerProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const icons = PROPERTY_ICONS.filter((icon) =>
    `${icon.label} ${icon.keywords}`
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );

  const chooseRandom = () => {
    const pool = icons.length > 0 ? icons : PROPERTY_ICONS;
    const icon = pool[Math.floor(Math.random() * pool.length)];
    onChange(icon.id);
  };

  return (
    <div
      aria-label="Icon"
      data-property-icon-picker
      className="w-[408px] overflow-hidden p-0"
      onPointerDown={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <div className="flex h-10 items-center border-b px-2">
        <span className="border-foreground flex h-10 items-center border-b text-sm">
          Icon
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:bg-accent ml-auto h-7 rounded-md px-2 text-sm"
        >
          Remove
        </button>
      </div>
      <div className="flex h-11 items-center gap-2 px-2">
        <div className="bg-secondary flex h-8 min-w-0 flex-1 items-center rounded-md px-2">
          <Search className="text-muted-foreground mr-2 size-4" />
          <input
            autoFocus
            aria-label="Filter icons"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Filter..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          aria-label="Random icon"
          onClick={chooseRandom}
          className="text-muted-foreground hover:bg-accent flex size-7 items-center justify-center rounded-md"
        >
          <Shuffle className="size-4" />
        </button>
      </div>
      <div className="text-muted-foreground px-3 py-1 text-xs font-medium">
        Icons
      </div>
      <div
        data-property-icon-grid
        className="grid max-h-[246px] grid-cols-12 gap-0 overflow-y-auto px-4 pb-2"
      >
        {icons.map((icon) => (
            <button
              type="button"
              key={icon.id}
              aria-label={icon.label}
              title={icon.label}
              onClick={() => onChange(icon.id)}
              className={`hover:bg-accent flex size-8 items-center justify-center rounded-[5px] p-0 ${value === icon.id ? "bg-accent" : ""}`}
            >
              <PropertyIconGlyph
                iconId={icon.id}
                className="text-muted-foreground size-6"
              />
            </button>
          ))}
      </div>
    </div>
  );
}
