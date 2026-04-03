import { ImageGallery } from "@/components/card/media/CardMedia";
import MediaUploader from "@/components/card/media/MediaUploader";

type ImageBlockContentProps =
  | {
      mode: "view";
      urls: string[];
      items?: unknown[];
      onFullscreenChange?: (isFullscreen: boolean) => void;
      displayMode?: "fixed" | "fluid";
      zoom?: number;
    }
  | {
      mode: "edit";
      urls: unknown[];
      onChange: (data: unknown[]) => void;
      initialFile?: File;
      onConsumeInitialFile?: () => void;
      onFilesExcess?: (files: File[]) => void;
      maxFiles?: number;
    };

export const ImageBlockContent = (props: ImageBlockContentProps) => {
  if (props.mode === "view") {
    return (
      <ImageGallery
        urls={props.urls}
        items={props.items}
        onFullscreenChange={props.onFullscreenChange}
        displayMode={props.displayMode}
        zoom={props.zoom}
      />
    );
  }

  return (
    <MediaUploader
      type="image"
      urls={props.urls}
      onChange={props.onChange}
      maxFiles={props.maxFiles ?? 1}
      initialFile={props.initialFile}
      onConsumeInitialFile={props.onConsumeInitialFile}
      onFilesExcess={props.onFilesExcess}
    />
  );
};
