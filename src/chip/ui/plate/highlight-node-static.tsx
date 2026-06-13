import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";

const HighlightLeafStatic = (props: SlateLeafProps) => (
  <SlateLeaf {...props} as="mark" className="bg-highlight/30 text-inherit">
    {props.children}
  </SlateLeaf>
);

export { HighlightLeafStatic };
