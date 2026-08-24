import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function ToolbarIcon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <ToolbarIcon {...props}>
      <path d="M2.4 3.7a.7.7 0 1 0 0 1.4h11.2a.7.7 0 1 0 0-1.4zm9.5 3.594H4.1a.7.7 0 1 0 0 1.4h7.8a.7.7 0 1 0 0-1.4M5.8 10.9a.7.7 0 1 0 0 1.4h4.4a.7.7 0 1 0 0-1.4z" />
    </ToolbarIcon>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <ToolbarIcon {...props}>
      <path d="M11.348 2.672a.625.625 0 0 0-.884 0L7.666 5.471a.625.625 0 1 0 .884.883l1.731-1.73v8.262a.625.625 0 1 0 1.25 0V4.623l1.732 1.731a.625.625 0 0 0 .884-.883zM5.093 2.49a.625.625 0 0 0-.625.624v8.263L2.737 9.646a.625.625 0 1 0-.884.883l2.798 2.799c.244.244.64.244.884 0l2.798-2.798a.625.625 0 0 0-.884-.884l-1.73 1.73V3.115a.625.625 0 0 0-.626-.625" />
    </ToolbarIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <ToolbarIcon {...props}>
      <path d="M7.1 1.975a5.125 5.125 0 1 0 3.155 9.164l3.107 3.107a.625.625 0 1 0 .884-.884l-3.107-3.107A5.125 5.125 0 0 0 7.1 1.975M3.225 7.1a3.875 3.875 0 1 1 7.75 0 3.875 3.875 0 0 1-7.75 0" />
    </ToolbarIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <ToolbarIcon {...props}>
      <path d="M2.25 5.531h5.692a2.126 2.126 0 0 0 4.116 0h1.692a.625.625 0 1 0 0-1.25H12a2.126 2.126 0 0 0-4 0H2.25a.625.625 0 1 0 0 1.25M10 4.125a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75m-4 9c.921 0 1.706-.586 2-1.406h5.75a.625.625 0 0 0 0-1.25H8.058a2.126 2.126 0 0 0-4.116 0H2.25a.625.625 0 1 0 0 1.25H4a2.13 2.13 0 0 0 2 1.406m0-1.25a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75" />
    </ToolbarIcon>
  );
}
