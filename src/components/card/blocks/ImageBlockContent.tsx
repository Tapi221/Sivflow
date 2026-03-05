import React from "react";
import MediaUploader from "../media/MediaUploader";
import { ImageGallery } from "../media/CardMedia";

type ImageBlockContentProps =
  | {
      mode: "view";
      urls: string[];
      items?: unknown[];
      onFullscreenChange?: (isFullscreen: boolean) => void;
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

export function ImageBlockContent(props: ImageBlockContentProps) {
  if (props.mode === "view") {
    return (
      <ImageGallery
        urls={props.urls}
        items={props.items}
        onFullscreenChange={props.onFullscreenChange}
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
}
