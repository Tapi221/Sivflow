import { createSelectionCaptureImageAsset } from "./createSelectionCaptureImageAsset";
import type { CardBlock } from "@/types";



type ApplyCardSelectionCaptureSide = "question" | "answer";
type CapturedCardImage = Awaited<ReturnType<typeof createSelectionCaptureImageAsset>>;



const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
const normalizeSelectionCaptureOcrText = (text: string | null): string | null => {
  const normalized = text?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};
const createCaptureImageBlock = ({
  side,
  image,
  insertIndex,
}: {
  side: ApplyCardSelectionCaptureSide;
  image: CapturedCardImage;
  insertIndex: number;
}): CardBlock => ({
  id: `${side}-image-capture-${uid()}`,
  type: "image",
  images: [image],
  audios: [],
  content: "",
  rowOffset: 0,
  orderIndex: insertIndex,
});
const createCaptureTextBlock = ({
  side,
  text,
  insertIndex,
}: {
  side: ApplyCardSelectionCaptureSide;
  text: string;
  insertIndex: number;
}): CardBlock => ({
  id: `${side}-text-capture-${uid()}`,
  type: "text",
  content: text,
  images: [],
  audios: [],
  rowOffset: 0,
  orderIndex: insertIndex,
});
const appendSelectionCaptureBlocks = ({ blocks, side, image, ocrText }: { blocks: CardBlock[];
  side: ApplyCardSelectionCaptureSide;
  image: CapturedCardImage;
  ocrText: string | null;
}): CardBlock[] => {
  const nextBlocks = [...blocks];
  nextBlocks.push(createCaptureImageBlock({ side, image, insertIndex: nextBlocks.length }));

  const normalizedOcrText = normalizeSelectionCaptureOcrText(ocrText);
  if (normalizedOcrText) {
    nextBlocks.push(createCaptureTextBlock({ side, text: normalizedOcrText, insertIndex: nextBlocks.length }));
  }

  return nextBlocks.map((block, index) => ({ ...block, orderIndex: index }));
};



export { normalizeSelectionCaptureOcrText, appendSelectionCaptureBlocks };


export type { ApplyCardSelectionCaptureSide, CapturedCardImage };
