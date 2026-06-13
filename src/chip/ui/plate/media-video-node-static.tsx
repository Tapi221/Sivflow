import type { TMediaElement } from "@platejs/media";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

type MediaVideoNodeStaticProps = PlateElementProps<TMediaElement>;

const MediaVideoNodeStatic = ({ className, element, children, ...props }: MediaVideoNodeStaticProps) => (
  <PlateElement className={cn("my-4", className)} element={element} {...props}>
    <video className="mx-auto max-h-[420px] max-w-full rounded-md" controls src={element.url} />
    {element.caption?.[0]?.children?.[0]?.text ? (
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        {element.caption[0].children[0].text}
      </figcaption>
    ) : null}
    {children}
  </PlateElement>
);

const VideoElementStatic = MediaVideoNodeStatic;

export { MediaVideoNodeStatic, VideoElementStatic };
export type { MediaVideoNodeStaticProps };
