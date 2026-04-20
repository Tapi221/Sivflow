import type { SVGProps } from "react";

export type MetaPanelToggleIconProps = Readonly<SVGProps<SVGSVGElement>>;

export const MetaPanelToggleIcon = ({
  className,
  ...props
}: MetaPanelToggleIconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="4.5" />
      <path d="M8 8.25v7.5" />
    </svg>
  );
};
