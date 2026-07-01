import React from "react";
import { cn } from "@web-renderer/lib/utils";



interface ExplorerRowContentProps {
  left?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
}



const ExplorerRowContent = React.memo(({ left, title, subtitle, right, titleClassName, subtitleClassName, contentClassName }: ExplorerRowContentProps) => {
  return (<> {left} <div className={cn("sidebar-label ds-list-item__content flex-1 min-w-0", contentClassName)} > {title ? (<div className={cn("sidebar-title ds-list-item__title text-sm truncate", titleClassName)} > {title} </div>) : null} {subtitle ? (<div className={cn("ds-list-item__subtitle text-xs truncate", subtitleClassName)} > {subtitle} </div>) : null} </div> {right} </>);
});

export { ExplorerRowContent };
