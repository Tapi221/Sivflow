import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

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
