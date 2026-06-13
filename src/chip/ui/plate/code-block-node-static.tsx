import { PlateElement } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import { cn } from "@/lib/utils";

type CodeBlockNodeStaticProps = PlateElementProps;

const CodeBlockNodeStatic = ({ className, children, ...props }: CodeBlockNodeStaticProps) => (
  <PlateElement
    as="pre"
    className={cn("my-4 overflow-x-auto rounded-md border bg-muted px-4 py-3 font-mono text-sm", className)}
    {...props}
  >
    <code>{children}</code>
  </PlateElement>
);

const CodeLineNodeStatic = ({ className, children, ...props }: PlateElementProps) => (
  <PlateElement as="div" className={cn("min-h-5", className)} {...props}>
    {children}
  </PlateElement>
);

const CodeSyntaxLeafStatic = ({ className, children, ...props }: PlateElementProps) => (
  <span className={cn(className)} {...props.attributes}>
    {children}
  </span>
);

const CodeBlockElementStatic = CodeBlockNodeStatic;
const CodeLineElementStatic = CodeLineNodeStatic;
const CodeSyntaxLeaf = CodeSyntaxLeafStatic;

export { CodeBlockElementStatic, CodeBlockNodeStatic, CodeLineElementStatic, CodeLineNodeStatic, CodeSyntaxLeaf, CodeSyntaxLeafStatic };
export type { CodeBlockNodeStaticProps };
