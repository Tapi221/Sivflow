import { BaseCaptionPlugin } from "@platejs/caption";
import { BaseAudioPlugin, BaseFilePlugin, BaseImagePlugin, BaseMediaEmbedPlugin, BasePlaceholderPlugin, BaseVideoPlugin } from "@platejs/media";
import { KEYS } from "platejs";
import { VideoElementStatic } from "@/chip/ui/node/media-video-node-static";
import { AudioElementStatic } from "@/chip/ui/plate/media-audio-node-static";
import { FileElementStatic } from "@/chip/ui/plate/media-file-node-static";
import { ImageElementStatic } from "@/chip/ui/plate/media-image-node-static";

const BaseMediaKit = [
  BaseImagePlugin.withComponent(ImageElementStatic),
  BaseVideoPlugin.withComponent(VideoElementStatic),
  BaseAudioPlugin.withComponent(AudioElementStatic),
  BaseFilePlugin.withComponent(FileElementStatic),
  BaseCaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
  BaseMediaEmbedPlugin,
  BasePlaceholderPlugin,
];

export { BaseMediaKit };
