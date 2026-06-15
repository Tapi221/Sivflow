import type { TAudioElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";

const AudioElementStatic = (props: SlateElementProps<TAudioElement>) => {
  const { element } = props;
  const caption = (element as any).caption?.[0]?.children?.[0]?.text;
  return (
    <SlateElement {...props} className="py-2.5">
      <figure className="my-0">
        <audio className="w-full" src={element.url as string} controls />
        {caption ? <figcaption className="mt-2 text-center text-muted-foreground text-sm">{caption}</figcaption> : null}
      </figure>
      {props.children}
    </SlateElement>
  );
};

export { AudioElementStatic };
