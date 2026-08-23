import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Search / magnifying glass — 001_magnifyingGlass_b65f3a8ab1.svg */
export const MagnifyingGlassIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M8.875 2.625a6.25 6.25 0 1 0 3.955 11.09l3.983 3.982a.625.625 0 1 0 .884-.884l-3.983-3.982a6.25 6.25 0 0 0-4.84-10.205m-5 6.25a5 5 0 1 1 10 0 5 5 0 0 1-10 0" />
    </svg>
  );
};

export default MagnifyingGlassIcon;