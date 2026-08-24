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
// dönüşürken bazı bilgi kaybedebilir (ör. sayı biçimlendirmesi).
export function coerceValue(
  value: CellValue,
  from: PropertyType,
  to: PropertyType,
  options: PropertyOption[],
): { value: CellValue; options: PropertyOption[] } {
  if (from === to) return { value, options };

  const labelOf = (id: string) =>
    options.find((o) => o.id === id)?.label ?? "";

  // Her tip → text: kayıpsız düz metin gösterimi.
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
    if (from === "checkbox") {
      return { value: value === true ? "On" : value === false ? "Off" : "", options };
    }
    if (from === "person" || from === "relation" || from === "files") {
      const ids = Array.isArray(value) ? value : [];
      return { value: ids.join(", "), options };
    }
    if (from === "date") {
      return {
        value:
          typeof value === "number" && Number.isFinite(value)
            ? new Date(value).toLocaleDateString("tr-TR")
            : "",
        options,
      };
    }
    return { value: value == null ? "" : String(value), options };
  }

  // text → hedef tip: basit ayrıştırma, başarısızsa boş.
  if (from === "text") {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return { value: emptyFor(to), options };

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

    if (to === "number") {
      const n = Number(text);
      return { value: Number.isFinite(n) ? n : null, options };
    }

    if (to === "checkbox") {
      const t = text.toLowerCase();
      if (["true", "on", "evet", "1", "yes"].includes(t)) return { value: true, options };
      if (["false", "off", "hayır", "0", "no"].includes(t)) return { value: false, options };
      return { value: null, options };
    }

    if (to === "date") {
      const n = Number(text);
      return { value: Number.isFinite(n) ? n : Date.parse(text) || null, options };
    }

    // url/email/phone/formula: metni olduğu gibi al.
    return { value: text, options };
  }

  if (from === "select" && to === "multiSelect") {
    return { value: typeof value === "string" ? [value] : [], options };
  }
  if (from === "multiSelect" && to === "select") {
    const ids = Array.isArray(value) ? value : [];
    return { value: ids[0] ?? null, options };
  }
  if (from === "checkbox" && to === "select") {
    // Notion davranışı: true → "On", false → "Off" seçeneklerine map'le.
    if (value === true || value === false) {
      const label = value ? "On" : "Off";
      const result = findOrCreateOption(label, options);
      return { value: result.option.id, options: result.options };
    }
    return { value: null, options };
  }
  if (from === "select" && to === "checkbox") {
    const id = typeof value === "string" ? value : "";
    const label = labelOf(id).toLowerCase();
    if (["on", "off", "checked", "unchecked", "done", "true", "false"].includes(label)) {
      return { value: !["off", "unchecked", "false"].includes(label), options };
    }
    return { value: label ? true : null, options };
  }

  // Çift yönlü array tipleri (person/relation/files) kendi aralarında aynı şekil.
  if (
    (from === "person" || from === "relation" || from === "files") &&
    (to === "person" || to === "relation" || to === "files")
  ) {
    return { value: Array.isArray(value) ? value : [], options };
  }

  return { value: emptyFor(to), options };
}

function emptyFor(to: PropertyType): CellValue {
  if (to === "multiSelect" || to === "person" || to === "relation" || to === "files") {
    return [];
  }
  return null;
}
