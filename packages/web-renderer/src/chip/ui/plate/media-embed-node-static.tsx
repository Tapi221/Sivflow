import { cn } from "@web-renderer/lib/utils";
import type { TMediaEmbedElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";

type MediaEmbedNodeStaticProps = SlateElementProps<TMediaEmbedElement>;

const MediaEmbedNodeStatic = ({ children, className, element, ...props }: MediaEmbedNodeStaticProps) => {
  return (
    <SlateElement className={cn("my-4", className)} element={element} {...props}>
      {children}
    </SlateElement>
  );
};

const MediaEmbedElementStatic = MediaEmbedNodeStatic;

export { MediaEmbedElementStatic, MediaEmbedNodeStatic };
export type { MediaEmbedNodeStaticProps };
