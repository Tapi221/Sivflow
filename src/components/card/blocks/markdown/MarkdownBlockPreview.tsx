import React from "react";
import { BlockSurface } from "@web-renderer/components/card/blocks/core/BlockSurface";
import { cn } from "@web-renderer/lib/utils";
import { MarkdownBlockDisplay } from "./MarkdownBlockDisplay";



interface MarkdownBlockViewProps {
  md: string;
  align?: "left" | "center";
  className?: string;
  bleedX?: boolean;
  style?: React.CSSProperties;
  zoom?: number;
}
type MarkdownBlockPreviewProps = {
  markdown: string;
  align?: "left" | "center";
  className?: string;
  bleedX?: boolean;
  style?: React.CSSProperties;
  zoom?: number;
};
interface MarkdownBlockPreviewSurfaceProps extends MarkdownBlockPreviewProps {
  contentClassName?: string;
}



const MarkdownBlockPreviewSurface: React.FC<
  MarkdownBlockPreviewSurfaceProps
> = ({
  markdown,
  align: _align,
  className,
  contentClassName,
  bleedX,
  style,
  zoom,
}) => {
  return (
    <BlockSurface ruled={true} className="flex-1">
      <div
        className="markdownBlockSurface w-full max-w-full bg-transparent overflow-visible"
        style={style}
      >
        <div className={cn("w-full max-w-full px-0 py-0", contentClassName)}>
          <MarkdownBlockDisplay
            markdown={markdown}
            className={className}
            bleedX={bleedX}
            zoom={zoom}
          />
        </div>
      </div>
    </BlockSurface>
  );
};
const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = ({ md, ...rest }) => {
  return <MarkdownBlockPreviewSurface markdown={md} {...rest} />;
};



export { MarkdownBlockView };


export type { MarkdownBlockPreviewProps };
