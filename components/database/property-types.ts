import { CircleDot, ListChecks, Type } from "lucide-react";

import { PropertyType } from "./types";

export const PROPERTY_TYPE_OPTIONS: {
  type: PropertyType;
  label: string;
  icon: typeof Type;
}[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "select", label: "Select", icon: CircleDot },
  { type: "multiSelect", label: "Multi-select", icon: ListChecks },
];
