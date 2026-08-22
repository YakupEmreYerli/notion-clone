import { cn } from "@/lib/utils";
import { optionColorClass } from "./colors";

interface OptionBadgeProps {
  label: string;
  color: string;
  className?: string;
}

export const OptionBadge = ({ label, color, className }: OptionBadgeProps) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-xs font-medium",
      optionColorClass(color),
      className,
    )}
  >
    {label}
  </span>
);
