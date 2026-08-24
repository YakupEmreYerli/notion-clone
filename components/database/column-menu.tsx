"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import {
  ArrowLeftToLine,
  ArrowDownNarrowWide,
  ArrowRightToLine,
  Copy,
  EyeOff,
  Info,
  ListFilter,
  Repeat2,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import type { PropertyIconId } from "@/lib/property-icons";

import { PROPERTY_TYPE_OPTIONS } from "./property-types";
import { PropertyIcon } from "./property-icon";
import { PropertyIconPicker } from "./property-icon-picker";
import type { DatabaseProperty, PropertyType } from "./types";
import type { SortDirection } from "./view-operations";

const MENU_ITEM_CLASS =
  "h-[31px] rounded-[5px] px-2 py-0 text-[14px] font-normal";
const MENU_SEPARATOR_CLASS = "mx-1 my-1 bg-border";

interface ColumnMenuProps {
  property: DatabaseProperty;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onChangeType: (type: PropertyType) => void;
  onFilter: () => void;
  onSort: (direction: SortDirection) => void;
  onHide: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const ColumnMenu = ({
  property,
  onInsertLeft,
  onInsertRight,
  onChangeType,
  onFilter,
  onSort,
  onHide,
  onDuplicate,
  onDelete,
  canDelete,
}: ColumnMenuProps) => {
  const renameProperty = useMutation(api.databases.renameProperty);
  const setPropertyIcon = useMutation(api.databases.setPropertyIcon);
  const [name, setName] = useState(property.name);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== property.name) {
      renameProperty({ propertyId: property._id, name: trimmed }).catch(() =>
        toast.error("Property could not be renamed"),
      );
    } else {
      setName(property.name);
    }
  };

  const changeIcon = (icon: PropertyIconId | null) => {
    setIconPickerOpen(false);
    setPropertyIcon({ propertyId: property._id, icon }).catch(() =>
      toast.error("Property icon could not be changed"),
    );
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setName(property.name);
        else {
          setIconPickerOpen(false);
          commitName();
        }
      }}
    >
      <DropdownMenuTrigger
        onPointerDown={(event) => event.stopPropagation()}
        className="flex h-full min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-sm font-normal"
      >
        <span className="relative size-4 shrink-0">
          <PropertyIcon
            property={property}
            className="text-muted-foreground absolute inset-0"
          />
        </span>
        <span className="truncate">{property.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[233px] rounded-[10px] border-border/80 p-1 shadow-lg"
        onInteractOutside={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest("[data-property-icon-picker]")
          ) {
            event.preventDefault();
          }
        }}
      >
        <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
          <PopoverAnchor asChild>
            <div className="flex h-9 items-center gap-2 px-1">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Change icon"
                  className="bg-secondary hover:bg-accent flex size-7 items-center justify-center rounded-[5px]"
                >
                  <PropertyIcon property={property} className="size-4" />
                </button>
              </PopoverTrigger>
              <div className="bg-secondary flex h-7 min-w-0 flex-1 items-center rounded-[5px] px-2">
                <input
                  aria-label="Property name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      setName(property.name);
                      event.currentTarget.blur();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <Info className="text-muted-foreground size-3.5 shrink-0" />
              </div>
            </div>
          </PopoverAnchor>
          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={0}
            className="w-[408px] p-0"
            onWheelCapture={(event) => event.stopPropagation()}
          >
            <PropertyIconPicker value={property.icon} onChange={changeIcon} />
          </PopoverContent>
        </Popover>
        <DropdownMenuSeparator className={MENU_SEPARATOR_CLASS} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={MENU_ITEM_CLASS}>
            <Repeat2 className="size-4" />
            Change type
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.type}
                disabled={option.type === property.type}
                onSelect={() => onChangeType(option.type)}
                className={MENU_ITEM_CLASS}
              >
                <option.icon className="size-4" />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator className={MENU_SEPARATOR_CLASS} />
        <DropdownMenuItem onSelect={onFilter} className={MENU_ITEM_CLASS}>
          <ListFilter className="size-4" />
          Filter
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={MENU_ITEM_CLASS}>
            <ArrowDownNarrowWide className="size-4" />
            Sort
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => onSort("asc")}>
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSort("desc")}>
              Descending
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={onHide} className={MENU_ITEM_CLASS}>
          <EyeOff className="size-4" />
          Hide
        </DropdownMenuItem>
        <DropdownMenuSeparator className={MENU_SEPARATOR_CLASS} />
        <DropdownMenuItem onSelect={onInsertLeft} className={MENU_ITEM_CLASS}>
          <ArrowLeftToLine className="size-4" />
          Insert left
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onInsertRight} className={MENU_ITEM_CLASS}>
          <ArrowRightToLine className="size-4" />
          Insert right
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate} className={MENU_ITEM_CLASS}>
          <Copy className="size-4" />
          Duplicate property
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canDelete}
          onSelect={onDelete}
          className={MENU_ITEM_CLASS}
        >
          <Trash className="size-4" />
          Delete property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
