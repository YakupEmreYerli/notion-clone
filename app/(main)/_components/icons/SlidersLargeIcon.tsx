import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Edit view — Notion `sliders` (viewBox 0 0 20 20, DOM'dan birebir).
 * `SlidersIcon` bunun 16x16'lık `slidersSmall` kardeşi; ikisi FARKLI
 * çizimler, birbirinin yerine kullanılmaz.
 */
export const SlidersLargeIcon = ({ className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={cn("size-5 shrink-0", className)}
    aria-hidden="true"
  >
    <path d="M3 7.375h6.829a2.501 2.501 0 0 0 4.842 0H17a.625.625 0 1 0 0-1.25h-2.329a2.501 2.501 0 0 0-4.842 0H3a.625.625 0 1 0 0 1.25M12.25 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5" />
    <path
      fillRule="evenodd"
      d="M7.75 15.75a2.5 2.5 0 0 0 2.421-1.875H17a.625.625 0 0 0 0-1.25h-6.829a2.5 2.5 0 0 0-4.842 0H3a.625.625 0 1 0 0 1.25h2.329A2.5 2.5 0 0 0 7.75 15.75m0-1.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5"
      clipRule="evenodd"
    />
  </svg>
);

export default SlidersLargeIcon;
