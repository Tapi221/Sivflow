import type { PlateLeafProps } from "platejs/react";
import { PlateLeaf } from "platejs/react";
import { cn } from "@/lib/utils";



type CommentNodeProps = PlateLeafProps & {
  active?: boolean;
};



const CommentNode = ({ active, className, children, ...props }: CommentNodeProps) => (
  <PlateLeaf
    className={cn("rounded-sm bg-yellow-500/20 px-0.5 ring-yellow-500/30", active && "ring-2", className)}
    {...props}
  >
    {children}
  </PlateLeaf>
);



const CommentLeaf = CommentNode;



export { CommentLeaf, CommentNode };


export type { CommentNodeProps };
