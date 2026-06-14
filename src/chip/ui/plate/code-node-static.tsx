import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";



const CodeLeafStatic = (props: SlateLeafProps) => (
  <SlateLeaf
    {...props}
    as="code"
    className="whitespace-pre-wrap rounded-md bg-muted px-1 py-0.5 font-mono text-sm"
  >
    {props.children}
  </SlateLeaf>
);



export { CodeLeafStatic };
