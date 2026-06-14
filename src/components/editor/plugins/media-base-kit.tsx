import { BaseCaptionPlugin } from "@platejs/caption";
import { BaseAudioPlugin, BaseFilePlugin, BaseImagePlugin, BaseMediaEmbedPlugin, BasePlaceholderPlugin, BaseVideoPlugin } from "@platejs/media";
import { KEYS } from "platejs";
import { AudioElementStatic } from "@/chip/ui/plate/media-audio-node-static";
import { MediaEmbedElementStatic } from "@/chip/ui/plate/media-embed-node-static";
import { FileElementStatic } from "@/chip/ui/plate/media-file-node-static";
import { ImageElementStatic } from "@/chip/ui/plate/media-image-node-static";
import { VideoElementStatic } from "@/chip/ui/plate/media-video-node-static";

const BaseMediaKit = [
  BaseImagePlugin.withComponent(ImageElementStatic),
  BaseVideoPlugin.withComponent(VideoElementStatic),
  BaseAudioPlugin.withComponent(AudioElementStatic),
  BaseFilePlugin.withComponent(FileElementStatic),
  BaseMediaEmbedPlugin.withComponent(MediaEmbedElementStatic),
  BaseCaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
  BasePlaceholderPlugin,
];

export { BaseMediaKit };
