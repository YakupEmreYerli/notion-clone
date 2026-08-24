"use client";

import { useMutation } from "convex/react";
import { Eye } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DatabaseProperty, DatabaseView } from "@/components/database/types";
import { cn } from "@/lib/utils";

// Kartlarda gösterilecek property'ler (view.visiblePropertyIds). Notion'da
// "Property visibility" — board kartındaki hücre satırları buradan belirlenir.
interface PropertiesPickerProps {
  view: DatabaseView;
  properties: DatabaseProperty[];
}

export const PropertiesPicker = ({
  view,
  properties,
}: PropertiesPickerProps) => {
  const updateSettings = useMutation(api.databaseViews.updateViewSettings);

  const visible = view.visiblePropertyIds ?? [];
  const nonTitle = properties.filter((p) => !p.isTitle);

  const toggle = (propertyId: Id<"databaseProperties">) => {
    const next = visible.includes(propertyId)
      ? visible.filter((id) => id !== propertyId)
      : [...visible, propertyId];
    updateSettings({ viewId: view._id, visiblePropertyIds: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Properties"
          className="text-foreground/80 hover:bg-secondary flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        >
          <Eye className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Properties
        </DropdownMenuLabel>
        {nonTitle.map((property) => {
          const on = visible.includes(property._id);
          return (
            <DropdownMenuItem
              key={property._id}
              onSelect={(e) => e.preventDefault()}
              onClick={() => toggle(property._id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{property.name}</span>
              <span
                className={cn(
                  "flex h-4 w-7 items-center rounded-full px-0.5 transition-colors",
                  on ? "justify-end bg-[var(--ring)]" : "justify-start bg-muted-foreground/30",
                )}
              >
                <span className="h-3 w-3 rounded-full bg-white" />
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};