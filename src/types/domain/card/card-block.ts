import type { CodeBlockData } from "@/types/domain/card";
import type { UploadedImage } from "@/types/domain/card";
import type { MathBlockData, ReferenceBlockData } from "@/types/domain/card";
export type BlockBase = {
  id: string;
  orderIndex: number;
  rowOffset?: number;
  offsetRows?: number;
  parentBlockId?: string | null;
};

export type TextBlock = BlockBase & {
  type: "text";
  content: string;
};

export type MarkdownBlock = BlockBase & {
  type: "markdown";
  markdown: string;
};

export type CodeBlock = BlockBase & {
  type: "code";
  code: CodeBlockData;
};

export type ImageBlock = BlockBase & {
  type: "image";
  images: UploadedImage[];
};

export type AudioBlock = BlockBase & {
  type: "audio";
  audios: Array<{ url: string; filename: string; order: number }>;
};

export type ReferenceBlock = BlockBase & {
  type: "reference";
  references: ReferenceBlockData[];
};

export type MathBlock = BlockBase & {
  type: "math";
  math: MathBlockData;
};

export type QuestionBlock = BlockBase & {
  type: "question";
  questionTitle: string;
  questionAnswer: string;
};

export type CardBlock =
  | TextBlock
  | MarkdownBlock
  | CodeBlock
  | ImageBlock
  | AudioBlock
  | ReferenceBlock
  | MathBlock
  | QuestionBlock;

