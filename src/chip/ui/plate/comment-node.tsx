import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

type CommentNodeProps = PlateElementProps & {
  active?: boolean;
};

const CommentNode = ({ active, className, children, ...props }: CommentNodeProps) => (
  <PlateElement
    className={cn("rounded-sm bg-yellow-500/20 px-0.5 ring-yellow-500/30", active && "ring-2", className)}
    {...props}
  >
    {children}
  </PlateElement>
);

const CommentLeaf = CommentNode;

export { CommentLeaf, CommentNode };

export type { CommentNodeProps };
