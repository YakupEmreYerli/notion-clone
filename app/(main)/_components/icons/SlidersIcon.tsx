import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Settings / sliders — 035_slidersSmall_72d400c390.svg */
export const SlidersIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M2.25 5.531h5.692a2.126 2.126 0 0 0 4.116 0h1.692a.625.625 0 1 0 0-1.25H12a2.126 2.126 0 0 0-4 0H2.25a.625.625 0 1 0 0 1.25M10 4.125a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75m-4 9c.921 0 1.706-.586 2-1.406h5.75a.625.625 0 0 0 0-1.25H8.058a2.126 2.126 0 0 0-4.116 0H2.25a.625.625 0 1 0 0 1.25H4a2.13 2.13 0 0 0 2 1.406m0-1.25a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75" />
    </svg>
  );
};

export default SlidersIcon;