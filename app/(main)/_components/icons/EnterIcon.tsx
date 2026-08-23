import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Enter / open indicator — 012_arrowTurnDownLeftSmall_3a32065fcc.svg */
export const EnterIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M12.995 3.175c.345 0 .625.28.625.625v4a1.825 1.825 0 0 1-1.825 1.825H3.704l2.453 2.453a.625.625 0 0 1-.884.884l-3.52-3.52a.625.625 0 0 1 0-.884l3.52-3.52a.625.625 0 1 1 .884.884L3.704 8.375h8.091a.575.575 0 0 0 .575-.575v-4c0-.345.28-.625.625-.625" />
    </svg>
  );
};

export default EnterIcon;