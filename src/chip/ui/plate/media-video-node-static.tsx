import type { TMediaElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";



type MediaVideoNodeStaticProps = SlateElementProps<TMediaElement>;



const MediaVideoNodeStatic = ({ children, className, element, ...props }: MediaVideoNodeStaticProps) => (
  <SlateElement className={cn("my-4", className)} element={element} {...props}>
    <video className="mx-auto max-h-96 max-w-full rounded-md" controls src={element.url} />
    {(element as any).caption?.[0]?.children?.[0]?.text ? (
      <figcaption className="mt-2 text-center text-muted-foreground text-sm">
        {(element as any).caption[0].children[0].text}
      </figcaption>
    ) : null}
    {children}
  </SlateElement>
);



const VideoElementStatic = MediaVideoNodeStatic;



export { MediaVideoNodeStatic, VideoElementStatic };


export type { MediaVideoNodeStaticProps };
