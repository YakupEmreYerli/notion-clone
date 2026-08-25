import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Source — Notion `pathRoundEnds` (viewBox 0 0 20 20, DOM'dan birebir). */
export const PathRoundEndsIcon = ({ className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={cn("size-5 shrink-0", className)}
    aria-hidden="true"
  >
    <path d="M12.718 4.625H6.313a3 3 0 0 0 0 6h7.562a1.75 1.75 0 1 1 0 3.5H7.282a2.126 2.126 0 1 0 0 1.25h6.593a3 3 0 1 0 0-6H6.313a1.75 1.75 0 1 1 0-3.5h6.405a2.126 2.126 0 1 0 0-1.25m1.157.625a.875.875 0 1 1 1.75 0 .875.875 0 0 1-1.75 0" />
  </svg>
);

export default PathRoundEndsIcon;
