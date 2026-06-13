import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";

const BlockquoteElementStatic = (props: SlateElementProps) => {
  return <SlateElement as="blockquote" className="my-1 border-l-2 pl-6 italic" {...props} />;
};

export { BlockquoteElementStatic };
