"use client";

import { Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PROPERTY_TYPE_OPTIONS } from "./property-types";
import { PropertyType } from "./types";

interface AddPropertyMenuProps {
  onCreate: (type: PropertyType) => void;
}

export const AddPropertyMenu = ({ onCreate }: AddPropertyMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Add property"
        className="text-muted-foreground hover:bg-primary/5 flex h-full w-full items-center justify-center"
      >
        <Plus className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {PROPERTY_TYPE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.type} onClick={() => onCreate(option.type)}>
            <option.icon className="mr-2 h-4 w-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
