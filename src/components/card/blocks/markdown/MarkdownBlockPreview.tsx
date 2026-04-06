import { BlockSurface } from "@/components/card/blocks/core/BlockSurface";
import { cn } from "@/lib/utils";
import React from "react";
import { MarkdownBlockContent } from "./MarkdownBlockContent";

interface MarkdownBlockViewProps {
  md: string;
  align?: "left" | "center";
  className?: string;
  bleedX?: boolean;
  style?: React.CSSProperties;
  zoom?: number;
}

export type MarkdownBlockPreviewProps = {
  markdown: string;
  align?: "left" | "center";
  className?: string;
  bleedX?: boolean;
  style?: React.CSSProperties;
  zoom?: number;
};

interface MarkdownBlockDisplayProps extends MarkdownBlockPreviewProps {
  contentClassName?: string;
}

const MarkdownBlockDisplay: React.FC<MarkdownBlockDisplayProps> = ({
  markdown,
  align,
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
          <MarkdownBlockContent
            markdown={markdown}
            align={align}
            className={className}
            bleedX={bleedX}
            zoom={zoom}
          />
        </div>
      </div>
    </BlockSurface>
  );
};

export const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = ({
  md,
  ...rest
}) => {
  return <MarkdownBlockDisplay markdown={md} {...rest} />;
};
