import React from "react";
import { CardBlocksScene } from "@/components/card/blocks/shared/CardBlocksScene";
import { filterRenderableCardBlocks } from "@/components/card/blocks/shared/isRenderableCardBlock";
import { useViewerSceneProps } from "@/components/card/blocks/shared/useViewerSceneProps";
import type { SharedCardContentViewProps } from "./SharedCardContent.types";



const SharedCardViewScene = ({ blocks, onGalleryFullscreenChange, displayMode, zoom }: SharedCardContentViewProps) => {
  const viewerProps = useViewerSceneProps({ onGalleryFullscreenChange, displayMode, zoom });
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



export { SharedCardViewScene };
