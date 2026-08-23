import { cn } from "@/lib/utils";

interface EmptyChildrenRowProps {
  level: number;
  /** arborist'ten gelen satır stili (height/width) — paddingLeft override edilir. */
  style?: React.CSSProperties;
}

/**
 * Notion "No pages inside" boş-state satırı.
 *
 * Gerçek bir page değildir:
 * - clickable / hover background / drag / select / context menu YOK
 * - page icon / chevron YOK
 * - sadece pasif açıklama metni render edilir.
 *
 * Spec ölçüleri:
 * - row: 30px / min 27, padding 5px 8px, padding-left 16px
 * - label: flex-1, padding-left 16px, 14px normal (400), tertiary renk
 * - efektif yatay başlangıç: 16 + 16 = 32px (level 1 için)
 */
export const EmptyChildrenRow = ({ level, style }: EmptyChildrenRowProps) => {
  // Spec: level 1 için 16px + (seviye farkı başına 8px).
  // 16px row padding + 16px label padding = 32px efektif başlangıç.
  const padLeft = 16 + (level - 1) * 8;

  return (
    <div
      aria-hidden
      style={{
        ...style,
        height: 30,
        minHeight: 27,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: padLeft,
        paddingRight: 8,
      }}
      className="pointer-events-none flex w-full select-none items-center"
    >
      <span
        style={{ flex: "1 1 auto", minWidth: 0, paddingLeft: 16 }}
        className="truncate whitespace-nowrap text-[14px] font-normal text-sidebar-muted overflow-hidden text-ellipsis"
      >
        No pages inside
      </span>
    </div>
  );
};