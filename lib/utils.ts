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

/**
 * Notion'un "..." menüsündeki son düzenleme damgası: bugünse "Today at
 * 5:57 PM", dünse "Yesterday at ...", öncesiyse "Mar 4, 2026 at ...".
 * `now` testten geçilebilsin diye parametre.
 */
export function formatLastEdited(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const dayDiff = Math.round(
    (startOfDay(new Date(now)) - startOfDay(date)) / 86_400_000,
  );

  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Yesterday at ${time}`;

  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${day} at ${time}`;
}
