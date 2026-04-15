import { ImageGallery } from "@/components/card/media/CardMedia";
import MediaUploader from "@/components/card/media/MediaUploader";
import type { ImageGalleryItem } from "@/components/card/media/types";
import type { UploadedImage } from "@/types/domain/assets";
import type { CardDisplayMode } from "@/types/domain/cardSet";

type ImageBlockContentProps =
  | {
      mode: "view";
      urls: string[];
      items?: ImageGalleryItem[];
      onFullscreenChange?: (isFullscreen: boolean) => void;
      displayMode?: CardDisplayMode;
      zoom?: number;
    }
  | {
      mode: "edit";
      urls: UploadedImage[];
      onChange: (data: UploadedImage[]) => void;
      initialFile?: File;
      onConsumeInitialFile?: () => void;
      onFilesExcess?: (files: File[]) => void;
      maxFiles?: number;
      displayMode?: CardDisplayMode;
      zoom?: number;
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
      displayMode={props.displayMode}
      zoom={props.zoom}
    />
  );
};
