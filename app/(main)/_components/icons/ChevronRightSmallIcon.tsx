import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Menü satırlarındaki alt menü oku — Notion
 * `arrowChevronSingleRightSmall` (viewBox 0 0 16 16, DOM'dan birebir).
 */
export const ChevronRightSmallIcon = ({ className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={cn("size-4 shrink-0", className)}
    aria-hidden="true"
  >
    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
  </svg>
);

export default ChevronRightSmallIcon;
