import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Open page in new tab — 032_arrowDiagonalUpRight_543f3ebae6.svg */
export const ArrowDiagonalUpRightIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="4.42 0 11.16 20"
      fill="currentColor"
      className={cn("h-5 w-auto shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M15.575 5.05a.625.625 0 0 0-.625-.625H7.313a.625.625 0 1 0 0 1.25h6.128L4.596 14.52a.617.617 0 0 0 .012.872c.244.244.635.25.872.012l8.845-8.845v6.128a.625.625 0 1 0 1.25 0z" />
    </svg>
  );
};

export default ArrowDiagonalUpRightIcon;