import type { TAudioElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";



const AudioElementStatic = (props: PlateElementProps<TAudioElement>) => {
  const { element } = props;
  const caption = (element as any).caption?.[0]?.children?.[0]?.text;
  return (
    <PlateElement {...props} className="py-2.5">
      <figure className="my-0">
        <audio className="w-full" src={element.url as string} controls />
        {caption ? <figcaption className="mt-2 text-center text-muted-foreground text-sm">{caption}</figcaption> : null}
      </figure>
      {props.children}
    </PlateElement>
  );
};



export { AudioElementStatic };
