"use client";

import { useState } from "react";
import { Check, MoreHorizontal, Plus } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { OPTION_COLORS, optionColorClass } from "./colors";
import { OptionBadge } from "./option-badge";
import { PropertyOption } from "./types";

interface SelectOptionEditorProps {
  options: PropertyOption[];
  selectedIds: string[];
  onToggle: (optionId: string) => void;
  onCreate: (label: string) => void;
  onRename: (optionId: string, label: string) => void;
  onRecolor: (optionId: string, color: string) => void;
  onDelete: (optionId: string) => void;
}

export const SelectOptionEditor = ({
  options,
  selectedIds,
  onToggle,
  onCreate,
  onRename,
  onRecolor,
  onDelete,
}: SelectOptionEditorProps) => {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
  );

  const createButton = (
    <button
      onClick={() => {
        onCreate(trimmed);
        setQuery("");
      }}
      className="hover:bg-primary/5 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
    >
      <Plus className="h-3.5 w-3.5" />
      Create &quot;{trimmed}&quot;
    </button>
  );

  return (
    <Command className="w-64">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search for an option..."
      />
      <CommandList>
        <CommandEmpty className="px-1 py-1 text-left">
          {trimmed ? createButton : (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">
              Select an option or create one
            </p>
          )}
        </CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.id}
              value={option.label}
              onSelect={() => onToggle(option.id)}
              className="group/opt flex items-center justify-between gap-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    selectedIds.includes(option.id)
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                <OptionBadge label={option.label} color={option.color} />
              </div>
              <OptionMenu
                option={option}
                onRename={(label) => onRename(option.id, label)}
                onRecolor={(color) => onRecolor(option.id, color)}
                onDelete={() => onDelete(option.id)}
              />
            </CommandItem>
          ))}
        </CommandGroup>
        {trimmed && !exactMatch && options.length > 0 && (
          <div className="border-border border-t p-1">{createButton}</div>
        )}
      </CommandList>
    </Command>
  );
};

interface OptionMenuProps {
  option: PropertyOption;
  onRename: (label: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}

const OptionMenu = ({
  option,
  onRename,
  onRecolor,
  onDelete,
}: OptionMenuProps) => {
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(option.label);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setRenaming(false)}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        aria-label="Option menu"
        className="text-muted-foreground/60 shrink-0 rounded-sm p-0.5 opacity-0 hover:bg-neutral-300 group-hover/opt:opacity-100 dark:hover:bg-neutral-600"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {renaming ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(label);
                setRenaming(false);
              }
            }}
            className="bg-secondary mx-2 mb-1 w-[calc(100%-1rem)] rounded-sm px-2 py-1 text-sm outline-none"
          />
        ) : (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setRenaming(true);
            }}
          >
            Rename
          </DropdownMenuItem>
        )}
        <div className="grid grid-cols-5 gap-1 p-2">
          {OPTION_COLORS.map((color) => (
            <button
              key={color}
              aria-label={color}
              onClick={() => onRecolor(color)}
              className={cn(
                "h-5 w-5 rounded-full",
                optionColorClass(color).split(" ")[0],
                option.color === color && "ring-primary ring-2 ring-offset-1",
              )}
            />
          ))}
        </div>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-red-600 focus:text-red-600"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
