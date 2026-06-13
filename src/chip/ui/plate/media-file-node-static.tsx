import type { TFileElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";



const FileElementStatic = (props: PlateElementProps<TFileElement>) => {
  const { element } = props;
  const label = element.name ?? element.url ?? "file";
  return (
    <PlateElement {...props} className="my-px rounded-sm">
      <span className="inline-flex items-center rounded px-1 py-0.5 text-primary underline underline-offset-4">{label as string}</span>
      {props.children}
    </PlateElement>
  );
};



export { FileElementStatic };
