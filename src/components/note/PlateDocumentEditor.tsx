import { Plate, PlateController, usePlateEditor } from 'platejs/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AIKit } from '@/registry/components/editor/plugins/ai-kit';
import { BaseAlignKit } from '@/registry/components/editor/plugins/align-base-kit';
import { BasicBlocksKit } from '@/registry/components/editor/plugins/basic-blocks-kit';
import { BasicMarksKit } from '@/registry/components/editor/plugins/basic-marks-kit';
import { BlockSelectionKit } from '@/registry/components/editor/plugins/block-selection-kit';
import { BaseCalloutKit } from '@/registry/components/editor/plugins/callout-base-kit';
import { BaseCodeBlockKit } from '@/registry/components/editor/plugins/code-block-base-kit';
import { BaseColumnKit } from '@/registry/components/editor/plugins/column-base-kit';
import { CommentKit } from '@/registry/components/editor/plugins/comment-kit';
import { BaseDateKit } from '@/registry/components/editor/plugins/date-base-kit';
import { DiscussionKit } from '@/registry/components/editor/plugins/discussion-kit';
import { DndKit } from '@/registry/components/editor/plugins/dnd-kit';
import { EmojiKit } from '@/registry/components/editor/plugins/emoji-kit';
import { FixedToolbarKit } from '@/registry/components/editor/plugins/fixed-toolbar-kit';
import { FloatingToolbarKit } from '@/registry/components/editor/plugins/floating-toolbar-kit';
import { BaseFontKit } from '@/registry/components/editor/plugins/font-base-kit';
import { BaseFootnoteKit } from '@/registry/components/editor/plugins/footnote-base-kit';
import { BaseLineHeightKit } from '@/registry/components/editor/plugins/line-height-base-kit';
import { LinkKit } from '@/registry/components/editor/plugins/link-kit';
import { ListKit } from '@/registry/components/editor/plugins/list-kit';
import { MarkdownKit } from '@/registry/components/editor/plugins/markdown-kit';
import { BaseMathKit } from '@/registry/components/editor/plugins/math-base-kit';
import { MediaKit } from '@/registry/components/editor/plugins/media-kit';
import { BaseMentionKit } from '@/registry/components/editor/plugins/mention-base-kit';
import { SuggestionKit } from '@/registry/components/editor/plugins/suggestion-kit';
import { TableKit } from '@/registry/components/editor/plugins/table-kit';
import { BaseTocKit } from '@/registry/components/editor/plugins/toc-base-kit';
import { BaseToggleKit } from '@/registry/components/editor/plugins/toggle-base-kit';
import { Editor, EditorContainer } from '@/registry/ui/editor';
import type { Note, NoteBlockContent } from '@/types';

type PlateDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, 'content' | 'contentText' | 'contentVersion' | 'editor'>) => void | Promise<void>;
};

type PlateTextNode = {
  text: string;
  [key: string]: unknown;
};

type PlateElementNode = {
  type: string;
  children: PlateNode[];
  [key: string]: unknown;
};

type PlateNode = PlateElementNode | PlateTextNode;

type PlateChangePayload = unknown[] | {
  value?: unknown;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const NOTE_PLATE_PLUGINS = [
  ...AIKit,
  ...BasicBlocksKit,
  ...BaseCodeBlockKit,
  ...TableKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...MediaKit,
  ...BaseCalloutKit,
  ...BaseColumnKit,
  ...BaseMathKit,
  ...BaseDateKit,
  ...LinkKit,
  ...BaseMentionKit,
  ...BasicMarksKit,
  ...BaseFontKit,
  ...ListKit,
  ...BaseAlignKit,
  ...BaseLineHeightKit,
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,
  ...BlockSelectionKit,
  ...DndKit,
  ...EmojiKit,
  ...MarkdownKit,
  ...BaseFootnoteKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === 'string';

const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === 'string' && Array.isArray(value.children);

const createEmptyValue = (): PlateElementNode[] => [{ type: 'p', children: [{ text: '' }] }];

const getTextFromLegacyContent = (content: unknown): string => Array.isArray(content) ? content.map((item) => isRecord(item) && typeof item.text === 'string' ? item.text : '').join('') : '';

const getNodeText = (node: unknown): string => {
  if (isPlateTextNode(node)) return node.text;
  if (!isRecord(node) || !Array.isArray(node.children)) return '';
  return node.children.map(getNodeText).join('');
};

const getPlainText = (nodes: unknown[]): string => nodes.map(getNodeText).filter(Boolean).join('\n');

const toInitialValue = (content: NoteBlockContent | undefined): PlateElementNode[] => {
  if (!Array.isArray(content) || content.length === 0) return createEmptyValue();
  if (content.every(isPlateElementNode)) return content as PlateElementNode[];

  const migrated = content.map((block) => {
    const text = isRecord(block) ? getTextFromLegacyContent(block.content) || (typeof block.text === 'string' ? block.text : '') : '';
    return { type: 'p', children: [{ text }] };
  }).filter((node) => getNodeText(node).trim().length > 0);

  return migrated.length > 0 ? migrated : createEmptyValue();
};

const getChangeValue = (change: PlateChangePayload): unknown[] | null => {
  if (Array.isArray(change)) return change;
  if (isRecord(change) && Array.isArray(change.value)) return change.value;
  return null;
};

const PlateDocumentEditor = ({ note, onChange }: PlateDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialValue(note.content), [note.content]);
  const editor = usePlateEditor({
    plugins: NOTE_PLATE_PLUGINS,
    value: initialValue,
  });
  const latestChangeRef = useRef<Pick<Note, 'content' | 'contentText' | 'contentVersion' | 'editor'> | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const flushPendingChange = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const changes = latestChangeRef.current;
    latestChangeRef.current = null;
    if (changes) void onChange(changes);
  }, [onChange]);

  const handleChange = useCallback((change: PlateChangePayload) => {
    const value = getChangeValue(change);
    if (!value) return;

    latestChangeRef.current = {
      content: value as NoteBlockContent,
      contentText: getPlainText(value),
      contentVersion: NOTE_CONTENT_VERSION,
      editor: 'plate',
    };

    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(flushPendingChange, NOTE_SAVE_DEBOUNCE_MS);
  }, [flushPendingChange]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  return (
    <div className="h-full min-h-0 w-full bg-background text-foreground">
      <TooltipProvider delayDuration={300}>
        <PlateController>
          <Plate editor={editor} onChange={handleChange} primary>
            <EditorContainer variant="demo">
              <Editor variant="demo" placeholder="本文を入力" spellCheck />
            </EditorContainer>
          </Plate>
        </PlateController>
      </TooltipProvider>
    </div>
  );
};

export { PlateDocumentEditor };
