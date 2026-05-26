import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconAddCircleProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export const IconAddCircle = ({
  className,
  title,
  ...props
}: IconAddCircleProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      className={cn("h-[30px] w-[30px]", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect width="30" height="30" rx="14.8571" fill="#767680" fillOpacity="0.12" />
      <path
        d="M15.3333 8C16.0264 8 16.596 8.52879 16.6606 9.20492L16.6667 9.33333L16.6663 13.9993L21.3333 14C22.0697 14 22.6667 14.597 22.6667 15.3333C22.6667 16.0264 22.1379 16.596 21.4617 16.6606L21.3333 16.6667L16.6663 16.6663L16.6667 21.3333C16.6667 22.0697 16.0697 22.6667 15.3333 22.6667C14.6403 22.6667 14.0707 22.1379 14.0061 21.4617L14 21.3333L13.9993 16.6663L9.33333 16.6667C8.59695 16.6667 8 16.0697 8 15.3333C8 14.6403 8.52879 14.0707 9.20492 14.0061L9.33333 14L13.9993 13.9993L14 9.33333C14 8.59695 14.597 8 15.3333 8Z"
        fill="#3C3C43"
        fillOpacity="0.6"
      />
    </svg>
  );
};