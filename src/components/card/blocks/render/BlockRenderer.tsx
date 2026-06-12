import { useMemo } from "react";
import { CardBlocksScene } from "@/components/card/blocks/shared/CardBlocksScene";
import { filterRenderableCardBlocks } from "@/components/card/blocks/shared/isRenderableCardBlock";
import { useViewerSceneProps } from "@/components/card/blocks/shared/useViewerSceneProps";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: CardDisplayMode;
  zoom?: number;
}



const BlockRenderer = ({ blocks, onGalleryFullscreenChange, displayMode = "fixed", zoom = 1 }: BlockRendererProps) => {
  const viewerProps = useViewerSceneProps({ onGalleryFullscreenChange, displayMode, zoom });

  const renderableBlocks = useMemo(
    () => filterRenderableCardBlocks(blocks),
    [blocks],
  );

  if (!renderableBlocks.length) return null;

  return (
    <CardBlocksScene
      blocks={renderableBlocks}
      resolveSceneProps={() => ({
        mode: "view",
        viewerProps,
      })}
    />
  );
};



export { BlockRenderer };
