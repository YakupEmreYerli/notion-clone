import { PropertyType } from "./cellValue";

export interface PropertyOption {
  id: string;
  label: string;
  color: string;
}

type CellValue = string | number | boolean | string[] | null;

const COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];

export function generateOptionId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function findOrCreateOption(
  label: string,
  options: PropertyOption[],
): { option: PropertyOption; options: PropertyOption[] } {
  const trimmed = label.trim();
  const existing = options.find(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return { option: existing, options };

  const option: PropertyOption = {
    id: generateOptionId(),
    label: trimmed,
    color: COLORS[options.length % COLORS.length],
  };
  return { option, options: [...options, option] };
}

// Saf fonksiyon — DB'ye dokunmaz, çağıran taraf dönen `options`'ı
// property'ye, `value`'yu satıra yazar. select ↔ multiSelect kayıpsızdır
// çünkü option id'leri aynı property'de yaşar; diğer yönler metne/idlere
// dönüşürken bazı bilgi kaybedebilir (ör. sayı biçimlendirmesi M6'da).
export function coerceValue(
  value: CellValue,
  from: PropertyType,
  to: PropertyType,
  options: PropertyOption[],
): { value: CellValue; options: PropertyOption[] } {
  if (from === to) return { value, options };

  const labelOf = (id: string) =>
    options.find((o) => o.id === id)?.label ?? "";

  if (to === "text") {
    if (from === "select") {
      return {
        value: typeof value === "string" ? labelOf(value) : "",
        options,
      };
    }
    if (from === "multiSelect") {
      const ids = Array.isArray(value) ? value : [];
      return { value: ids.map(labelOf).filter(Boolean).join(", "), options };
    }
    return { value: value == null ? "" : String(value), options };
  }

  if (from === "text") {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return { value: to === "multiSelect" ? [] : null, options };

    if (to === "select") {
      const result = findOrCreateOption(text, options);
      return { value: result.option.id, options: result.options };
    }

    if (to === "multiSelect") {
      let nextOptions = options;
      const ids: string[] = [];
      for (const part of text.split(",")) {
        if (!part.trim()) continue;
        const result = findOrCreateOption(part, nextOptions);
        nextOptions = result.options;
        ids.push(result.option.id);
      }
      return { value: ids, options: nextOptions };
    }
  }

  if (from === "select" && to === "multiSelect") {
    return { value: typeof value === "string" ? [value] : [], options };
  }
  if (from === "multiSelect" && to === "select") {
    const ids = Array.isArray(value) ? value : [];
    return { value: ids[0] ?? null, options };
  }

  return { value: null, options };
}
