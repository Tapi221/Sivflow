import { cn } from "@web-renderer/lib/utils";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

type ParagraphNodeProps = PlateElementProps;

const ParagraphNode = ({ className, children, ...props }: ParagraphNodeProps) => (
  <PlateElement className={cn("m-0 px-0 py-1", className)} {...props}>
    {children}
  </PlateElement>
);

const ParagraphElement = ParagraphNode;

export { ParagraphElement, ParagraphNode };
export type { ParagraphNodeProps };
