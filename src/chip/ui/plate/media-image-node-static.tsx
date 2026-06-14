import type { TImageElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";



const ImageElementStatic = (props: SlateElementProps<TImageElement>) => {
  const { element } = props;
  const caption = (element as any).caption?.[0]?.children?.[0]?.text;
  return (
    <SlateElement {...props} className="py-2.5">
      <figure className="my-0">
        <img
          className={cn("block max-w-full rounded-sm object-cover")}
          alt={element.name ?? ""}
          src={element.url as string}
        />
        {caption ? <figcaption className="mt-2 text-center text-muted-foreground text-sm">{caption}</figcaption> : null}
      </figure>
      {props.children}
    </SlateElement>
  );
};



export { ImageElementStatic };
