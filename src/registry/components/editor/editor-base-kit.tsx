import { BaseAlignKit } from '@/registry/components/editor/plugins/align-base-kit';
import { BaseBasicBlocksKit } from '@/registry/components/editor/plugins/basic-blocks-base-kit';
import { BaseBasicMarksKit } from '@/registry/components/editor/plugins/basic-marks-base-kit';
import { BaseCalloutKit } from '@/registry/components/editor/plugins/callout-base-kit';
import { BaseCodeBlockKit } from '@/registry/components/editor/plugins/code-block-base-kit';
import { BaseColumnKit } from '@/registry/components/editor/plugins/column-base-kit';
import { BaseCommentKit } from '@/registry/components/editor/plugins/comment-base-kit';
import { BaseDateKit } from '@/registry/components/editor/plugins/date-base-kit';
import { BaseFootnoteKit } from '@/registry/components/editor/plugins/footnote-base-kit';
import { BaseFontKit } from '@/registry/components/editor/plugins/font-base-kit';
import { BaseLineHeightKit } from '@/registry/components/editor/plugins/line-height-base-kit';
import { BaseLinkKit } from '@/registry/components/editor/plugins/link-base-kit';
import { BaseListKit } from '@/registry/components/editor/plugins/list-base-kit';
import { MarkdownKit } from '@/registry/components/editor/plugins/markdown-kit';
import { BaseMathKit } from '@/registry/components/editor/plugins/math-base-kit';
import { BaseMediaKit } from '@/registry/components/editor/plugins/media-base-kit';
import { BaseMentionKit } from '@/registry/components/editor/plugins/mention-base-kit';
import { BaseSuggestionKit } from '@/registry/components/editor/plugins/suggestion-base-kit';
import { BaseTableKit } from '@/registry/components/editor/plugins/table-base-kit';
import { BaseTocKit } from '@/registry/components/editor/plugins/toc-base-kit';
import { BaseToggleKit } from '@/registry/components/editor/plugins/toggle-base-kit';

export const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseCodeBlockKit,
  ...BaseTableKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...BaseMediaKit,
  ...BaseCalloutKit,
  ...BaseColumnKit,
  ...BaseMathKit,
  ...BaseDateKit,
  ...BaseLinkKit,
  ...BaseMentionKit,
  ...BaseBasicMarksKit,
  ...BaseFontKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...BaseLineHeightKit,
  ...BaseCommentKit,
  ...BaseSuggestionKit,
  ...MarkdownKit,
  ...BaseFootnoteKit,
];
