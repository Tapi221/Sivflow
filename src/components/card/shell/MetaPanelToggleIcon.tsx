import type { SVGProps } from "react";



type MetaPanelToggleIconProps = Readonly<SVGProps<SVGSVGElement> & { open?: boolean;
}
>;



const MetaPanelToggleIcon = ({ className, open = false, ...props }: MetaPanelToggleIconProps) => {
  const indicatorX = open ? 7.25 : 14.25;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x={indicatorX}
        y="6.25"
        width="2.5"
        height="11.5"
        rx="1.25"
        fill="currentColor"
      />
    </svg>
  );
};



export { MetaPanelToggleIcon };


export type { MetaPanelToggleIconProps };
