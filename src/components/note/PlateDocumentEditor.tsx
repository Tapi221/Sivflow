import { BlockquoteRules, BoldRules, CodeRules, HeadingRules, HighlightRules, HorizontalRuleRules, ItalicRules, MarkComboRules, StrikethroughRules, UnderlineRules } from '@platejs/basic-nodes';
import { BlockquotePlugin, BoldPlugin, CodePlugin, H1Plugin, H2Plugin, H3Plugin, H4Plugin, H5Plugin, H6Plugin, HighlightPlugin, HorizontalRulePlugin, ItalicPlugin, StrikethroughPlugin, UnderlinePlugin } from '@platejs/basic-nodes/react';
import { CaptionPlugin } from '@platejs/caption/react';
import { IndentPlugin } from '@platejs/indent/react';
import { LinkRules } from '@platejs/link';
import { LinkPlugin } from '@platejs/link/react';
import { BulletedListRules, OrderedListRules, TaskListRules } from '@platejs/list';
import { ListPlugin } from '@platejs/list/react';
import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { AudioPlugin, FilePlugin, ImagePlugin, MediaEmbedPlugin, PlaceholderPlugin, VideoPlugin } from '@platejs/media/react';
import { TableCellHeaderPlugin, TableCellPlugin, TablePlugin, TableRowPlugin } from '@platejs/table/react';
import { KEYS } from 'platejs';
import { ParagraphPlugin, Plate, PlateContainer, PlateContent, PlateController, usePlateEditor } from 'platejs/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
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
  ParagraphPlugin,
  H1Plugin.configure({ inputRules: [HeadingRules.markdown()], rules: { break: { empty: 'reset' } }, shortcuts: { toggle: { keys: 'mod+alt+1' } } }),
  H2Plugin.configure({ inputRules: [HeadingRules.markdown()], rules: { break: { empty: 'reset' } }, shortcuts: { toggle: { keys: 'mod+alt+2' } } }),
  H3Plugin.configure({ inputRules: [HeadingRules.markdown()], rules: { break: { empty: 'reset' } }, shortcuts: { toggle: { keys: 'mod+alt+3' } } }),
  H4Plugin.configure({ inputRules: [HeadingRules.markdown()], rules: { break: { empty: 'reset' } }, shortcuts: { toggle: { keys: 'mod+alt+4' } } }),
  H5Plugin.configure({ inputRules: [HeadingRules.markdown()], rules: { break: { empty: 'reset' } }, shortcuts: { toggle: { keys: 'mod+alt+5' } } }),
  H6Plugin.configure({ inputRules: [HeadingRules.markdown()], rules: { break: { empty: 'reset' } }, shortcuts: { toggle: { keys: 'mod+alt+6' } } }),
  BlockquotePlugin.configure({ inputRules: [BlockquoteRules.markdown()], shortcuts: { toggle: { keys: 'mod+shift+period' } } }),
  HorizontalRulePlugin.configure({ inputRules: [HorizontalRuleRules.markdown({ variant: '-' }), HorizontalRuleRules.markdown({ variant: '_' })] }),
  BoldPlugin.configure({ inputRules: [BoldRules.markdown({ variant: '*' }), BoldRules.markdown({ variant: '_' }), MarkComboRules.markdown({ variant: 'boldItalic' }), MarkComboRules.markdown({ variant: 'boldUnderline' }), MarkComboRules.markdown({ variant: 'boldItalicUnderline' }), MarkComboRules.markdown({ variant: 'italicUnderline' })] }),
  ItalicPlugin.configure({ inputRules: [ItalicRules.markdown({ variant: '*' }), ItalicRules.markdown({ variant: '_' })] }),
  UnderlinePlugin.configure({ inputRules: [UnderlineRules.markdown()] }),
  CodePlugin.configure({ inputRules: [CodeRules.markdown()], shortcuts: { toggle: { keys: 'mod+e' } } }),
  StrikethroughPlugin.configure({ inputRules: [StrikethroughRules.markdown()], shortcuts: { toggle: { keys: 'mod+shift+x' } } }),
  HighlightPlugin.configure({ inputRules: [HighlightRules.markdown({ variant: '==' }), HighlightRules.markdown({ variant: '≡' })], shortcuts: { toggle: { keys: 'mod+shift+h' } } }),
  IndentPlugin.configure({ inject: { targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.img] }, options: { offset: 24 } }),
  ListPlugin.configure({ inputRules: [BulletedListRules.markdown({ variant: '-' }), BulletedListRules.markdown({ variant: '*' }), OrderedListRules.markdown({ variant: '.' }), OrderedListRules.markdown({ variant: ')' }), TaskListRules.markdown({ checked: false }), TaskListRules.markdown({ checked: true })] }),
  LinkPlugin.configure({ inputRules: [LinkRules.markdown(), LinkRules.autolink({ variant: 'paste' }), LinkRules.autolink({ variant: 'space' }), LinkRules.autolink({ variant: 'break' })] }),
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
  ImagePlugin.configure({ options: { disableUploadInsert: true } }),
  MediaEmbedPlugin,
  VideoPlugin,
  AudioPlugin,
  FilePlugin,
  PlaceholderPlugin.configure({ options: { disableEmptyPlaceholder: true } }),
  CaptionPlugin.configure({ options: { query: { allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed] } } }),
  MarkdownPlugin.configure({ options: { plainMarks: [KEYS.suggestion, KEYS.comment], remarkPlugins: [remarkMath, remarkGfm, remarkEmoji as any, remarkMdx, remarkMention] } }),
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
      <PlateController>
        <Plate editor={editor} onChange={handleChange} primary>
          <PlateContainer className="relative h-[650px] w-full cursor-text select-text overflow-y-auto caret-primary selection:bg-brand/25 focus-visible:outline-none">
            <PlateContent className="relative size-full w-full cursor-text select-text overflow-x-hidden whitespace-pre-wrap break-words px-16 pt-4 pb-72 text-base outline-none sm:px-[max(64px,calc(50%-350px))]" placeholder="本文を入力" spellCheck />
          </PlateContainer>
        </Plate>
      </PlateController>
    </div>
  );
};

export { PlateDocumentEditor };
