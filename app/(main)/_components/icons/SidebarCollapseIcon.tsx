import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Sidebar collapse (daraltma) icon - user provided double chevron left
 * viewBox 0 0 20 20 width 20 height 20 fill currentColor
 */
export const SidebarCollapseIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="currentColor"
      className={cn("h-[20px] w-[20px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M3.608 10.442a.625.625 0 0 1 0-.884l5.4-5.4a.625.625 0 0 1 .884.884L4.934 10l4.958 4.958a.625.625 0 1 1-.884.884z" />
      <path d="m14.508 4.158-5.4 5.4a.625.625 0 0 0 0 .884l5.4 5.4a.625.625 0 1 0 .884-.884L10.434 10l4.958-4.958a.625.625 0 1 0-.884-.884" />
    </svg>
  );
};

export default SidebarCollapseIcon;
