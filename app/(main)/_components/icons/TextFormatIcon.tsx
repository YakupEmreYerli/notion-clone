import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Title only "Aa" — 004_textFormat_ff70cab34a.svg */
export const TextFormatIcon = ({ className }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="1.72 0 16.56 20"
      fill="currentColor"
      className={cn("h-5 w-auto shrink-0", className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="m8.793 12.35 1.124 3.042a.625.625 0 1 0 1.172-.434L7.352 4.846a.988.988 0 0 0-1.854 0L1.76 14.958a.625.625 0 0 0 1.172.434l1.124-3.042zM8.33 11.1 6.425 5.943 4.519 11.1zm9.323-2.381c.345 0 .625.28.625.625v5.83a.625.625 0 1 1-1.25 0v-.204a3.26 3.26 0 0 1-2.21.83c-.903 0-1.742-.342-2.353-.98s-.961-1.537-.961-2.592.35-1.943.968-2.567c.615-.623 1.453-.942 2.346-.942.824 0 1.606.272 2.21.802v-.177c0-.345.28-.625.625-.625m-4.9 3.51c0-.774.252-1.33.608-1.69.358-.362.864-.57 1.457-.57s1.107.209 1.472.573c.361.361.616.917.616 1.686 0 1.503-.966 2.322-2.088 2.322-.582 0-1.088-.217-1.45-.595-.362-.377-.614-.952-.614-1.727"
        clipRule="evenodd"
      />
    </svg>
  );
};

export default TextFormatIcon;