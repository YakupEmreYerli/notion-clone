import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Rename — Notion `pencilLine` (viewBox 0 0 20 20, DOM'dan birebir). */
export const PencilLineIcon = ({ className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={cn("size-5 shrink-0", className)}
    aria-hidden="true"
  >
    <path d="m13.987 5.682-.684.684-1.288-1.288.692-.691a.91.91 0 0 1 1.28 0c.35.35.35.93 0 1.28zm-9.433 9.433 7.914-7.914-1.289-1.289-7.92 7.908c-.122.122-.214.29-.274.457l-.336 1.082c-.06.229.153.442.366.366l1.082-.335q.252-.07.457-.275m12.446.76H5.61l1.25-1.25H17a.625.625 0 1 1 0 1.25" />
  </svg>
);

export default PencilLineIcon;
