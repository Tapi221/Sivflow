import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";

const ParagraphElementStatic = (props: SlateElementProps) => {
  return (
    <SlateElement className={cn("m-0 px-0 py-1")} {...props}>
      {props.children}
    </SlateElement>
  );
};

export { ParagraphElementStatic };
