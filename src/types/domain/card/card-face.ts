import type { CardBlock } from "./card-block";
import type { InkDocument } from "@/components/ink/inkTypes";

export type CardFace = {
  blocks: CardBlock[];
  ink?: InkDocument | null;
  extraRows?: number;
};
