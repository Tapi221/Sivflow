import { cn } from "@web-renderer/lib/utils";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";



type MentionNodeStaticProps = PlateElementProps & {
  value?: string;
};



const MentionNodeStatic = ({ className, value, children, ...props }: MentionNodeStaticProps) => (
  <PlateElement
    className={cn("inline-flex rounded-sm bg-muted px-1 text-sm font-medium text-muted-foreground", className)}
    {...props}
  >
    @{value ?? children}
  </PlateElement>
);



const MentionElementStatic = MentionNodeStatic;



export { MentionElementStatic, MentionNodeStatic };


export type { MentionNodeStaticProps };
