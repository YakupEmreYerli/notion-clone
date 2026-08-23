import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Plus icon - user provided SVG
 * viewBox 0 0 16 16 width 16 height 16 fill currentColor
 * Path M8 2.74...
 * Used for Add New, Add sub-page, Private header etc.
 * Placement: centered inside 20x20 or 22x22 hit area
 */
export const PlusIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      className={cn("h-[16px] w-[16px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74" />
    </svg>
  );
};

export default PlusIcon;
