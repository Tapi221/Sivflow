import { BlockList } from "@/components/card/blocks/core/BlockList";
import { CardBlockLayoutRenderer } from "@/components/card/blocks/shared/CardBlockLayoutRenderer";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { CardBlock } from "@/types/domain/card";
import { useCallback, useMemo } from "react";

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}

export const BlockRenderer = ({
  blocks,
  onGalleryFullscreenChange,
  displayMode = "fixed",
  zoom = 1,
}: BlockRendererProps) => {
  const { settings } = useUserSettings();
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";

  const toMediaUrl = useCallback(
    (
      item:
        | {
            url?: string | null;
            remoteUrl?: string | null;
            localUrl?: string | null;
          }
        | string
        | null
        | undefined,
    ) => {
      if (typeof item === "string") return item;
      if (!item) return null;
      return item.url ?? item.remoteUrl ?? item.localUrl ?? null;
    },
    [],
  );

  const isRenderableBlock = useCallback((block: CardBlock) => {
    if (block.type === "text") return (block.content ?? "").trim() !== "";
    if (block.type === "question") {
      return (
        (block.questionTitle ?? "").trim() !== "" ||
        (block.questionAnswer ?? "").trim() !== ""
      );
    }
    if (block.type === "code") return (block.code?.code ?? "").trim() !== "";
    if (block.type === "image") return (block.images?.length ?? 0) > 0;
    if (block.type === "audio") return (block.audios?.length ?? 0) > 0;
    if (block.type === "math") return (block.math?.latex ?? "").trim() !== "";
    if (block.type === "markdown") return (block.markdown ?? "").trim() !== "";
    return false;
  }, []);

  const renderableBlocks = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.filter(isRenderableBlock);
  }, [blocks, isRenderableBlock]);

  if (!renderableBlocks.length) return null;

  return (
    <BlockList
      blocks={renderableBlocks}
      renderBlock={(block, meta) => (
        <CardBlockLayoutRenderer
          mode="view"
          block={block}
          meta={meta}
          viewerProps={{
            questionDisplayMode,
            onGalleryFullscreenChange,
            toMediaUrl,
            displayMode,
            zoom,
          }}
        />
      )}
    />
  );
};
