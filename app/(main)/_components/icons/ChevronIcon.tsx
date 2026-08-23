import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  expanded?: boolean;
};

/**
 * Down chevron - user provided SVG
 * viewBox 0 0 16 16 width 12 height 12 fill currentColor
 * Path: M7.47 10.93...
 * Spec: 12px size, closed -90deg (right), open 0deg (down), 200ms ease-out
 */
export const ChevronIcon = ({ className, expanded }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="currentColor"
      className={cn(
        "h-[12px] w-[12px] shrink-0 transition-transform duration-200 ease-out",
        expanded ? "rotate-0" : "-rotate-90",
        className,
      )}
      aria-hidden="true"
    >
      <path d="M7.47 10.93a.75.75 0 0 0 1.06 0l4.32-4.32a.75.75 0 1 0-1.06-1.06L8 9.34 4.21 5.55a.75.75 0 0 0-1.06 1.06z" />
    </svg>
  );
};

export default ChevronIcon;
