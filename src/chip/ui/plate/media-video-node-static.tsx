import type { TMediaElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";



type MediaVideoNodeStaticProps = SlateElementProps<TMediaElement>;



const MediaVideoNodeStatic = ({ children, className, element, ...props }: MediaVideoNodeStaticProps) => {
  const captionText = (element as any).caption?.[0]?.children?.[0]?.text;
  const shouldRenderCaption = captionText !== undefined && captionText.length > 0;
  return (
    <SlateElement className={cn("my-4", className)} element={element} {...props}>
      <video className="mx-auto max-h-96 max-w-full rounded-md" controls src={element.url} />
      {shouldRenderCaption && (
        <figcaption className="mt-2 text-center text-muted-foreground text-sm">
          {captionText}
        </figcaption>
      )}
      {children}
    </SlateElement>
  );
};



const VideoElementStatic = MediaVideoNodeStatic;



export { MediaVideoNodeStatic, VideoElementStatic };



export type { MediaVideoNodeStaticProps };
