"use client";

import { CaptionPlugin } from "@platejs/caption/react";
import { AudioPlugin, FilePlugin, ImagePlugin, MediaEmbedPlugin, PlaceholderPlugin, VideoPlugin } from "@platejs/media/react";
import { KEYS } from "platejs";
import { MediaPreviewDialog } from "@/chip/ui/dialog/media-preview-dialog";
import { MediaUploadToast } from "@/chip/ui/media-upload-toast";
import { MediaEmbedElement } from "@/chip/ui/node/media-embed-node";
import { FileElement } from "@/chip/ui/node/media-file-node";
import { PlaceholderElement } from "@/chip/ui/node/media-placeholder-node";
import { VideoElement } from "@/chip/ui/node/media-video-node";
import { AudioElement } from "@/chip/ui/plate/media-audio-node";
import { ImageElement } from "@/chip/ui/plate/media-image-node";

const MediaKit = [
  ImagePlugin.configure({
    options: { disableUploadInsert: true },
    render: { afterEditable: MediaPreviewDialog, node: ImageElement },
  }),
  MediaEmbedPlugin.withComponent(MediaEmbedElement),
  VideoPlugin.withComponent(VideoElement),
  AudioPlugin.withComponent(AudioElement),
  FilePlugin.withComponent(FileElement),
  PlaceholderPlugin.configure({
    options: { disableEmptyPlaceholder: true },
    render: { afterEditable: MediaUploadToast, node: PlaceholderElement },
  }),
  CaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
];

export { MediaKit };
