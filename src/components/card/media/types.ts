import type { ImageBlockLayout, UploadedImage } from "@/types";

type LegacyImageLike = {
  url?: string | null;
  remoteUrl?: string | null;
  localUrl?: string | null;
  localFileId?: string | null;
  assetId?: string | null;
  scale?: number | null;
  x?: number | null;
  layout?: ImageBlockLayout | null;
  naturalW?: number | null;
  naturalH?: number | null;
};

export type ImageGalleryItem =
  | string
  | Pick<
      UploadedImage,
      | "id"
      | "assetId"
      | "localFileId"
      | "localUrl"
      | "remoteUrl"
      | "scale"
      | "x"
      | "layout"
      | "naturalW"
      | "naturalH"
    >
  | LegacyImageLike;
