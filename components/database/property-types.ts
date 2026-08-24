import {
  Calendar,
  CircleDot,
  FileText,
  Link2,
  ListChecks,
  Mail,
  Phone,
  Sigma,
  SquareCheckBig,
  SquareFunction,
  Type,
  Users,
} from "lucide-react";

import { PropertyType } from "./types";

export const PROPERTY_TYPE_OPTIONS: {
  type: PropertyType;
  label: string;
  icon: typeof Type;
}[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "select", label: "Select", icon: CircleDot },
  { type: "multiSelect", label: "Multi-select", icon: ListChecks },
  { type: "checkbox", label: "Checkbox", icon: SquareCheckBig },
  { type: "number", label: "Number", icon: Sigma },
  { type: "date", label: "Date", icon: Calendar },
  { type: "url", label: "URL", icon: Link2 },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "person", label: "Person", icon: Users },
  { type: "relation", label: "Relation", icon: FileText },
  { type: "formula", label: "Formula", icon: SquareFunction },
  { type: "files", label: "Files", icon: FileText },
];

// Notion board yalnızca bu tiplerle gruplanabilir; diğer tipler tek "default"
// gruba düşer (group-by seçici Faz 5'te bu listeyle kısıtlanacak).
export const GROUPABLE_TYPES: PropertyType[] = [
  "select",
  "multiSelect",
  "checkbox",
  "date",
  "person",
  "relation",
  "formula",
];