import type { TFileElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";



const FileElementStatic = (props: SlateElementProps<TFileElement>) => {
  const { element } = props;
  const label = element.name ?? element.url ?? "file";
  return (
    <SlateElement {...props} className="my-px rounded-sm">
      <span className="inline-flex items-center rounded px-1 py-0.5 text-primary underline underline-offset-4">{label as string}</span>
      {props.children}
    </SlateElement>
  );
};



export { FileElementStatic };
