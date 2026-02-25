import React from 'react';
import MediaUploader from '../MediaUploader';
import { ImageGallery } from '../CardMedia';

type ImageBlockContentProps =
  | {
      mode: 'view';
      urls: string[];
      onFullscreenChange?: (isFullscreen: boolean) => void;
    }
  | {
      mode: 'edit';
      urls: any[];
      onChange: (data: any[]) => void;
      initialFile?: File;
      onConsumeInitialFile?: () => void;
      onFilesExcess?: (files: File[]) => void;
      maxFiles?: number;
    };

export function ImageBlockContent(props: ImageBlockContentProps) {
  if (props.mode === 'view') {
    return <ImageGallery urls={props.urls} onFullscreenChange={props.onFullscreenChange} />;
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

