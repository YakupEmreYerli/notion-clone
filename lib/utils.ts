import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Başlığı boş belgeler için türe göre yer tutucu ("New page"/"New database"). */
export function getDocumentLabel(
  title: string | undefined,
  type: "page" | "database" | undefined,
) {
  if (title) return title;
  return type === "database" ? "New database" : "New page";
}
