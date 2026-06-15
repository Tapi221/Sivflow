import React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/chip/ui/select";
import { MathEditorDialog } from "@/chip/panel/dialog.desktop/Dialog.MathEditor";
import { CodeBlockContent } from "@/components/card/blocks/code/CodeBlockContent";
import { normalizeEditorLanguage } from "@/components/card/blocks/code/codeBlockLanguage";
import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import type { MarkdownReplaceBlock } from "@/components/card/blocks/markdown/MarkdownBlockContent";
import { MarkdownBlockContent } from "@/components/card/blocks/markdown/MarkdownBlockContent";
import { MathBlockPreviewPane } from "@/components/card/blocks/math/MathBlockPreviewPane";
import { QuestionBlockContent } from "@/components/card/blocks/question/QuestionBlockContent";
import { TextBlockContent } from "@/components/card/blocks/text/TextBlockContent";
import { sanitizeReferences } from "@/components/card/editor/cardEditorUtils";
import { AudioPlayer } from "@/components/card/media/CardMedia";
import { cn } from "@/lib/utils";
import type { CodeBlockData } from "@/types/core/code-block";
import type { UploadedImage } from "@/types/domain/assets";
import type { MathBlockData, ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock } from "@/types/domain/card";
import { Code, HelpCircle, Link, NotebookPen, Sigma, Type, Volume2 } from "@/chip/icons/icons";

type CardBlockLayoutReplaceBlock = MarkdownReplaceBlock;

export { CardBlockSceneRenderer };
export type { CardBlockLayoutReplaceBlock, ViewerProps, EditorProps };
