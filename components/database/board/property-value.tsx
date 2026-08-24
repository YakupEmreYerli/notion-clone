import { Check, File, Users } from "lucide-react";

import { DatabaseProperty, DatabaseRow } from "@/components/database/types";
import { cn } from "@/lib/utils";
import { groupColorVars } from "./board-colors";

// Board kartında bir property'nin değerini render eder. Notion'da kart
// üzerindeki her property bir satırdır: min-height 28px, padding 5px,
// radius 5px; select/multiSelect badge olarak, diğerleri basit gösterimle.
interface PropertyValueProps {
  property: DatabaseProperty;
  row: DatabaseRow;
}

const BoardOptionBadge = ({ label, color }: { label: string; color: string }) => {
  const colors = groupColorVars(color);
  return (
    <span
      className="inline-flex h-[18px] max-w-full items-center truncate rounded-[4px] px-1.5 text-[12px] leading-[18px] font-normal"
      style={{ backgroundColor: colors.badgeBg, color: colors.badgeFg }}
    >
      {label}
    </span>
  );
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export const PropertyValue = ({ property, row }: PropertyValueProps) => {
  const value = row.cells[property._id];

  if (value === undefined || value === null || value === "") {
    return (
      <span className="text-muted-foreground/60 text-xs">
        {property.type === "checkbox" ? "☐" : "Empty"}
      </span>
    );
  }

  switch (property.type) {
    case "select": {
      const option = property.options?.find((o) => o.id === value);
      if (!option) return <span className="text-xs">{String(value)}</span>;
      return <BoardOptionBadge label={option.label} color={option.color} />;
    }
    case "multiSelect": {
      const ids = Array.isArray(value) ? value : [];
      const options = (property.options ?? []).filter((o) => ids.includes(o.id));
      return (
        <span className="flex flex-wrap items-center gap-1">
          {options.map((o) => (
            <BoardOptionBadge key={o.id} label={o.label} color={o.color} />
          ))}
        </span>
      );
    }
    case "checkbox":
      return (
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px]",
            value === true
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border",
          )}
        >
          {value === true && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      );
    case "date":
      return typeof value === "number" ? (
        <span className="text-xs">{formatDate(value)}</span>
      ) : null;
    case "number":
      return <span className="text-xs">{String(value)}</span>;
    case "person":
    case "relation":
    case "files": {
      const ids = Array.isArray(value) ? value : [];
      if (ids.length === 0) return null;
      return (
        <span className="flex items-center gap-1.5 text-xs">
          <span className="bg-muted text-muted-foreground flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium">
            {property.type === "person" ? (
              <Users className="h-2.5 w-2.5" />
            ) : (
              <File className="h-2.5 w-2.5" />
            )}
          </span>
          {ids.length} {ids.length === 1 ? "item" : "items"}
        </span>
      );
    }
    case "url":
      return (
        <span className="text-primary truncate text-xs underline-offset-2 hover:underline">
          {String(value)}
        </span>
      );
    default:
      return (
        <span className="text-muted-foreground truncate text-xs">
          {String(value)}
        </span>
      );
  }
};
