import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  strokeWidth?: number;
};

/**
 * Notion-style page / document icon
 * Spec: width 18px height 18px per measurement table
 * Icon slot 22x18, icon-text gap 8px, row 30px
 */
export const PageIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="4.12 2.37 11.75 15.25"
      width="18"
      height="18"
      fill="currentColor"
      className={cn("h-[18px] w-[18px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M13.3 14.25a.55.55 0 0 1-.55.55h-5.5a.55.55 0 1 1 0-1.1h5.5a.55.55 0 0 1 .55.55m-.55-1.95a.55.55 0 1 0 0-1.1h-5.5a.55.55 0 0 0 0 1.1z" />
      <path d="M6.25 2.375A2.125 2.125 0 0 0 4.125 4.5v11c0 1.174.951 2.125 2.125 2.125h7.5a2.125 2.125 0 0 0 2.125-2.125V8.121c0-.563-.224-1.104-.622-1.502L11.63 2.997a2.13 2.13 0 0 0-1.502-.622zM5.375 4.5c0-.483.392-.875.875-.875h3.7V6.25A2.05 2.05 0 0 0 12 8.3h2.625v7.2a.875.875 0 0 1-.875.875h-7.5a.875.875 0 0 1-.875-.875zm8.691 2.7H12a.95.95 0 0 1-.95-.95V4.184z" />
    </svg>
  );
};

export default PageIcon;
