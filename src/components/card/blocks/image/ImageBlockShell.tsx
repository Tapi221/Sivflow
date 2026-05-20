import React from "react";

import { BlockInset } from "@/components/card/blocks/editor/BlockInset";

import { cn } from "@/lib/utils";

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
