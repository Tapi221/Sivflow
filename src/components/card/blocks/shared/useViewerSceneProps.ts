import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { useCallback, useMemo } from "react";

import type { ViewerProps } from "@/components/card/blocks/shared/CardBlockLayoutRenderer";

type UseViewerScenePropsArgs = Readonly<{
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: CardDisplayMode;
  zoom?: number;
}>;

export const useViewerSceneProps = ({
  onGalleryFullscreenChange,
  displayMode = "fixed",
  zoom = 1,
}: UseViewerScenePropsArgs): ViewerProps => {
  const { settings } = useUserSettings();
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";

  const toMediaUrl = useCallback<ViewerProps["toMediaUrl"]>((item) => {
    if (typeof item === "string") return item;
    if (!item) return null;
    return item.url ?? item.remoteUrl ?? item.localUrl ?? null;
  }, []);

  return useMemo(
    () => ({
      questionDisplayMode,
      onGalleryFullscreenChange,
      toMediaUrl,
      displayMode,
      zoom,
    }),
    [
      displayMode,
      onGalleryFullscreenChange,
      questionDisplayMode,
      toMediaUrl,
      zoom,
    ],
  );
};
