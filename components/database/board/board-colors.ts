// Grup rengi token'ı → CSS değişkeni haritası. Renk adı option'dan gelir
// ("blue" vb.); Tailwind dinamik class üretemediği için inline CSS var
// referansı kullanıyoruz. Bilinmeyen renk gray'e düşer.
export interface GroupColorVars {
  tint: string;
  ring: string;
  badgeBg: string;
  badgeFg: string;
  actionFg: string;
  cardBg: string;
  cardBgHover: string;
}

const COLOR_VAR_SUFFIX = [
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

export function groupColorVars(color?: string): GroupColorVars {
  const c = COLOR_VAR_SUFFIX.includes(color as (typeof COLOR_VAR_SUFFIX)[number])
    ? color
    : "gray";
  return {
    tint: `var(--kanban-${c}-tint)`,
    ring: `var(--kanban-${c}-ring)`,
    badgeBg: `var(--kanban-${c}-badge-bg)`,
    badgeFg: `var(--kanban-${c}-badge-fg)`,
    actionFg: `var(--kanban-${c}-action-fg)`,
    cardBg: `var(--kanban-${c}-card-bg)`,
    cardBgHover: `var(--kanban-${c}-card-bg-hover)`,
  };
}
