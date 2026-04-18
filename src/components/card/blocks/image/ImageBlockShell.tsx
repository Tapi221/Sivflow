import React from "react";
import { cn } from "@/lib/utils";
import { BlockInset } from "@/components/card/blocks/editor/BlockInset";

type ImageBlockShellProps = {
  children: React.ReactNode;
  className?: string;
};

export const ImageBlockShell = ({
  children,
  className,
}: ImageBlockShellProps) => {
  return (
    <BlockInset variant="image">
      <div className={cn("relative rounded-[11px] overflow-hidden", className)}>
        {children}
      </div>
    </BlockInset>
  );
};
