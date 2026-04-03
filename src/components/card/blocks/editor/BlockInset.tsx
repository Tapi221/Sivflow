import React from "react";
import { cn } from "@/lib/utils";

type BlockInsetVariant = "image" | "code" | "question";

interface BlockInsetProps {
  variant: BlockInsetVariant;
  className?: string;
  children: React.ReactNode;
}

export const BlockInset = ({ variant, className, children }: BlockInsetProps) => {
  return (
    <div className={cn("block-inset", `block-inset--${variant}`, className)}>
      {children}
    </div>
  );
};
