import { BaseCaptionPlugin } from "@platejs/caption";
import { BaseAudioPlugin, BaseFilePlugin, BaseImagePlugin, BaseMediaEmbedPlugin, BasePlaceholderPlugin, BaseVideoPlugin } from "@platejs/media";
import { AudioElementStatic } from "@web-renderer/chip/ui/plate/media-audio-node-static";
import { MediaEmbedElementStatic } from "@web-renderer/chip/ui/plate/media-embed-node-static";
import { FileElementStatic } from "@web-renderer/chip/ui/plate/media-file-node-static";
import { ImageElementStatic } from "@web-renderer/chip/ui/plate/media-image-node-static";
import { VideoElementStatic } from "@web-renderer/chip/ui/plate/media-video-node-static";
import { KEYS } from "platejs";

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
