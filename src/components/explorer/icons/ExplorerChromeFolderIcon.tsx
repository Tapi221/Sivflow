import type { SVGProps } from "react";
import { FolderIcon as AffineFolderIcon } from "@blocksuite/icons/rc";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  variant?: "default" | "large";
};

export const ExplorerChromeFolderIcon = ({ size = 15, className, ...props }: ExplorerChromeFolderIconProps) => <AffineFolderIcon width={size} height={size} aria-hidden="true" className={cn("shrink-0", className)} {...props} />;
