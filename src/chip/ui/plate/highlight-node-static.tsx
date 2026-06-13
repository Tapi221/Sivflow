import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";

const HighlightLeafStatic = (props: SlateLeafProps) => {
  return (
    <SlateLeaf {...props} as="mark" className="bg-muted text-inherit">
      {props.children}
    </SlateLeaf>
  );
};

export { HighlightLeafStatic };
