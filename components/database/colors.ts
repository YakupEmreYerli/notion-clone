// Renk *token* adı saklanır ("blue"), Tailwind class string'i değil —
// Tailwind v4 dinamik class'ları göremediği için lookup statik olmalı.
export const OPTION_COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

export type OptionColor = (typeof OPTION_COLORS)[number];

export const DEFAULT_OPTION_COLOR: OptionColor = "gray";

export const OPTION_COLOR_CLASSES: Record<OptionColor, string> = {
  gray: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200",
  brown: "bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-200",
  orange: "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200",
  yellow: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-200",
  green: "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-200",
  blue: "bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200",
  purple: "bg-purple-200 text-purple-900 dark:bg-purple-900/50 dark:text-purple-200",
  pink: "bg-pink-200 text-pink-900 dark:bg-pink-900/50 dark:text-pink-200",
  red: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200",
};

export function optionColorClass(color: string): string {
  return (
    OPTION_COLOR_CLASSES[color as OptionColor] ??
    OPTION_COLOR_CLASSES[DEFAULT_OPTION_COLOR]
  );
}

export function nextOptionColor(existingCount: number): OptionColor {
  return OPTION_COLORS[existingCount % OPTION_COLORS.length];
}
