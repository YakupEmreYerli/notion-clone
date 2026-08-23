import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  strokeWidth?: number;
};

/**
 * Notion-style database / grid icon
 * Spec: width 20px height 20px per measurement table
 * Icon slot 22x18, icon-text gap 8px, row 30px
 */
export const DatabaseIcon = ({ className }: Props) => {
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
      <path d="M4.5 4.125A2.125 2.125 0 0 0 2.375 6.25v7.5c0 1.174.951 2.125 2.125 2.125h11a2.125 2.125 0 0 0 2.125-2.125v-7.5A2.125 2.125 0 0 0 15.5 4.125zm11.875 7h-5.75v-2.25h5.75zm-5.75 1.25h5.75v1.375a.875.875 0 0 1-.875.875h-4.875zm-1.25-1.25h-5.75v-2.25h5.75zm-5.75 1.25h5.75v2.25H4.5a.875.875 0 0 1-.875-.875zm0-4.75V6.25c0-.483.392-.875.875-.875h4.875v2.25zm7 0v-2.25H15.5c.483 0 .875.392.875.875v1.375z" />
    </svg>
  );
};

export default DatabaseIcon;
