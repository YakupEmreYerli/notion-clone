import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Small down chevron (dropdown) — 006_arrowChevronSingleDownSmall_33022f40e7.svg */
export const ChevronDownSmallIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="3.06 0 9.88 16"
      fill="currentColor"
      className={cn("h-4 w-auto shrink-0", className)}
      aria-hidden="true"
    >
      <path d="m12.76 6.52-4.32 4.32a.62.62 0 0 1-.44.18.62.62 0 0 1-.44-.18L3.24 6.52a.63.63 0 0 1 0-.88c.24-.24.64-.24.88 0L8 9.52l3.88-3.88c.24-.24.64-.24.88 0s.24.64 0 .88" />
    </svg>
  );
};

export default ChevronDownSmallIcon;