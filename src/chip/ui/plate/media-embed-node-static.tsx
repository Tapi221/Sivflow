import type { TMediaEmbedElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";



type MediaEmbedNodeStaticProps = PlateElementProps<TMediaEmbedElement>;



const MediaEmbedNodeStatic = ({ className, element, children, ...props }: MediaEmbedNodeStaticProps) => (
  <PlateElement className={cn("my-4", className)} element={element} {...props}>
    <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{element.url}</div>
    {(element as any).caption?.[0]?.children?.[0]?.text ? (
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        {(element as any).caption[0].children[0].text}
      </figcaption>
    ) : null}
    {children}
  </PlateElement>
);



const MediaEmbedElementStatic = MediaEmbedNodeStatic;



export { MediaEmbedElementStatic, MediaEmbedNodeStatic };


export type { MediaEmbedNodeStaticProps };
