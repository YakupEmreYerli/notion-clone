import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Menüdeki seçili satır işareti — Notion `checkmarkSmall`
 * (viewBox 0 0 16 16, DOM'dan birebir).
 */
export const CheckmarkSmallIcon = ({ className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={cn("size-4 shrink-0", className)}
    aria-hidden="true"
  >
    <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z" />
  </svg>
);

export default CheckmarkSmallIcon;
