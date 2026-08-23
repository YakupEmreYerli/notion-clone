import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Filter toggle — 003_filterCircle_f449c32ca3.svg */
export const FilterCircleIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M8.35 12.274a.625.625 0 0 0 0 1.25h3.3a.625.625 0 1 0 0-1.25zM13 9.844a.625.625 0 1 1 0 1.25H7a.625.625 0 0 1 0-1.25zm-7-2.43a.625.625 0 1 0 0 1.25h8a.625.625 0 1 0 0-1.25z" />
      <path d="M10 2.375a7.625 7.625 0 1 0 0 15.25 7.625 7.625 0 0 0 0-15.25M3.625 10a6.375 6.375 0 1 1 12.75 0 6.375 6.375 0 0 1-12.75 0" />
    </svg>
  );
};

export default FilterCircleIcon;