import { CardBlocksScene } from "@/components/card/blocks/shared/CardBlocksScene";
import { filterRenderableCardBlocks } from "@/components/card/blocks/shared/isRenderableCardBlock";
import { useViewerSceneProps } from "@/components/card/blocks/shared/useViewerSceneProps";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

type SharedCardViewSceneProps = Readonly<{
  blocks: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: CardDisplayMode;
  zoom?: number;
}>;

export const SharedCardViewScene = ({
  blocks,
  onGalleryFullscreenChange,
  displayMode,
  zoom,
}: SharedCardViewSceneProps) => {
  const viewerProps = useViewerSceneProps({
    onGalleryFullscreenChange,
    displayMode,
    zoom,
  });

  const renderableBlocks = React.useMemo(
    () => filterRenderableCardBlocks(blocks),
    [blocks],
  );

  if (!renderableBlocks.length) {
    return null;
  }

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
