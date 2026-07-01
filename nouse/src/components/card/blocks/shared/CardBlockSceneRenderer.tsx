import React from "react";
import { Code, HelpCircle, Link, NotebookPen, Sigma, Type, Volume2 } from "@web-renderer/chip/icons/icons";
import { MathEditorDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.MathEditor";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@web-renderer/chip/ui/select";
import { BlockWrapper } from "@web-renderer/components/card/blocks/core/BlockWrapper";
import { TextBlockContent } from "@web-renderer/components/card/blocks/text/TextBlockContent";
import { cn } from "@web-renderer/lib/utils";
import { CodeBlockContent } from "@/components/card/blocks/code/CodeBlockContent";
import { normalizeEditorLanguage } from "@/components/card/blocks/code/codeBlockLanguage";
import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import type { MarkdownReplaceBlock } from "@/components/card/blocks/markdown/MarkdownBlockContent";
import { MarkdownBlockContent } from "@/components/card/blocks/markdown/MarkdownBlockContent";
import { MathBlockPreviewPane } from "@/components/card/blocks/math/MathBlockPreviewPane";
import { QuestionBlockContent } from "@/components/card/blocks/question/QuestionBlockContent";
import { sanitizeReferences } from "@/components/card/editor/cardEditorUtils";
import { AudioPlayer } from "@/components/card/media/CardMedia";
import type { CodeBlockData } from "@/types/core/code-block";
import type { UploadedImage } from "@/types/domain/assets";
import type { MathBlockData, ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock } from "@/types/domain/card";



type CardBlockLayoutReplaceBlock = MarkdownReplaceBlock;
type ViewerProps = Readonly<{ questionDisplayMode: "always" | "tap_to_reveal";
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  toMediaUrl: (item: string | { url?: string | null; remoteUrl?: string | null; localUrl?: string | null; } | null | undefined) => string | null;
  displayMode: "fixed" | "fluid";
  zoom: number;
}>;
type EditorProps = Readonly<{ onUpdateBlock: (id: string, updates: Partial<CardBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  accentColor?: string;
  isBlockSelected?: boolean;
  autoFocus?: boolean;
  customPlaceholder?: string;
  pendingUploadFile?: File;
  onConsumePendingUpload?: () => void;
  onFilesExcess?: (files: File[]) => void;
  onReplaceMarkdownWithBlocks?: (blocks: CardBlockLayoutReplaceBlock[]) => void;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}>;
type CardBlockSceneRendererProps =
  | Readonly<{ mode: "edit"; block: CardBlock; meta: BlockListRowMeta; editorProps: EditorProps; }>
  | Readonly<{ mode: "view"; block: CardBlock; meta: BlockListRowMeta; viewerProps: ViewerProps; }>;
type SharedShellProps = Readonly<{
  mode: "edit" | "view";
  className?: string;
  contentClassName?: string;
  label?: string;
  icon?: React.ElementType;
  accentColor?: string;
  isBlockSelected?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleClassName?: string;
  children: React.ReactNode;
}>;
type SceneProps = Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  meta?: BlockListRowMeta;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>;



const NOOP = () => {};
const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "markup", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "markdown", label: "Markdown" },
] as const;
const MAX_MATH_LATEX_LENGTH = 10000;



const renderGridOffsetSpacer = (gridOffsetPx: number) => gridOffsetPx > 0 ? <div aria-hidden className="pointer-events-none" style={{ height: `${gridOffsetPx}px` }} /> : null;
const renderEditorShellProps = (editorProps?: EditorProps) => ({
  accentColor: editorProps?.accentColor,
  isBlockSelected: editorProps?.isBlockSelected,
  onDelete: editorProps?.onDelete,
  onDuplicate: editorProps?.onDuplicate,
  onMoveUp: editorProps?.onMoveUp,
  onMoveDown: editorProps?.onMoveDown,
  onMoveDragStart: editorProps?.onMoveDragStart,
  onMoveDragEnd: editorProps?.onMoveDragEnd,
  canMoveUp: editorProps?.canMoveUp,
  canMoveDown: editorProps?.canMoveDown,
  dragHandleClassName: "js-block-drag-handle",
});



const SharedBlockShell = ({ mode, className, contentClassName, label, icon, accentColor, isBlockSelected, onDelete, onDuplicate, onMoveUp, onMoveDown, onMoveDragStart, onMoveDragEnd, canMoveUp, canMoveDown, dragHandleClassName, children }: SharedShellProps) => {
  if (mode === "view") {
    return <BlockWrapper mode="viewer" visualMode="viewer" showOverlay={false} showDelete={false} showDuplicate={false} showDragHandle={false} dragEnabled={false} onDelete={NOOP} onDuplicate={NOOP} className={className} contentClassName={contentClassName}>{children}</BlockWrapper>;
  }

  return <BlockWrapper onDelete={onDelete ?? NOOP} onDuplicate={onDuplicate ?? NOOP} className={className} contentClassName={contentClassName} label={label} icon={icon} accentColor={accentColor} isBlockSelected={isBlockSelected} canMoveUp={Boolean(canMoveUp)} canMoveDown={Boolean(canMoveDown)} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onMoveDragStart={onMoveDragStart} onMoveDragEnd={onMoveDragEnd} dragHandleClassName={dragHandleClassName} visualMode="viewer">{children}</BlockWrapper>;
};
const CodeLanguageSelector = ({ value, onChange }: Readonly<{ value: string; onChange: (next: string) => void; }>) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-5 w-auto min-w-0 min-h-0 rounded-md px-1.5 py-0 bg-zinc-900/5 border-none shadow-none text-xs font-bold text-zinc-500 tracking-wider uppercase hover:text-zinc-700 hover:bg-zinc-900/10 focus:ring-0 gap-1">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="bg-white">
        <SelectGroup>
          {SUPPORTED_LANGUAGES.map((language) => <SelectItem key={language.value} value={language.value} className="text-xs">{language.label}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
const TextBlockScene = ({ mode, block, editorProps, viewerProps }: SceneProps) => {
  const isEmpty = (block.content ?? "").trim().length === 0;
  return (
    <SharedBlockShell mode={mode} className={cn("bg-transparent px-0 py-0", !isEmpty && "border-0")} contentClassName="px-0" label="Text" icon={Type} {...renderEditorShellProps(editorProps)}>
      {mode === "edit" && editorProps ? <TextBlockContent mode="edit" content={block.content ?? ""} onChange={(content) => editorProps.onUpdateBlock(block.id, { content })} placeholder={editorProps.customPlaceholder ?? "文章を入力..."} autoFocus={editorProps.autoFocus} zoom={editorProps.zoom} /> : <TextBlockContent mode="view" content={String(block.content ?? "")} zoom={viewerProps?.zoom} />}
    </SharedBlockShell>
  );
};
const QuestionBlockScene = ({ mode, block, editorProps, viewerProps }: SceneProps) => {
  return (
    <SharedBlockShell mode={mode} className="bg-transparent px-0 py-0" contentClassName="px-0" label="Question" icon={HelpCircle} {...renderEditorShellProps(editorProps)}>
      {mode === "edit" && editorProps ? <QuestionBlockContent mode="edit" blockId={block.id} questionTitle={block.questionTitle} questionAnswer={block.questionAnswer} onChangeQuestionTitle={(questionTitle) => editorProps.onUpdateBlock(block.id, { questionTitle })} onChangeQuestionAnswer={(questionAnswer) => editorProps.onUpdateBlock(block.id, { questionAnswer })} zoom={editorProps.zoom} /> : <QuestionBlockContent mode="view" questionTitle={block.questionTitle} questionAnswer={block.questionAnswer} answerDisplayMode={viewerProps?.questionDisplayMode} zoom={viewerProps?.zoom} />}
    </SharedBlockShell>
  );
};
const CodeBlockScene = ({ mode, block, meta, editorProps, viewerProps }: SceneProps) => {
  const codeData = block.code ?? { language: "javascript", code: "" };
  const normalizedLanguage = normalizeEditorLanguage(codeData.language);
  const contentNode = mode === "edit" && editorProps ? <CodeBlockContent mode="editor" code={codeData.code} language={normalizedLanguage} onCodeChange={(code) => editorProps.onUpdateBlock(block.id, { code: { language: normalizedLanguage, code } satisfies CodeBlockData })} headerLeft={<CodeLanguageSelector value={normalizedLanguage} onChange={(language) => editorProps.onUpdateBlock(block.id, { code: { language: normalizeEditorLanguage(language), code: codeData.code ?? "" } satisfies CodeBlockData })} />} zoom={editorProps.zoom} /> : <CodeBlockContent mode="viewer" code={codeData.code ?? ""} language={codeData.language} zoom={viewerProps?.zoom} />;

  return <div className="w-full max-w-full overflow-visible">{renderGridOffsetSpacer(meta?.gridOffsetPx ?? 0)}<SharedBlockShell mode={mode} className={cn("bg-transparent px-0 py-0", (codeData.code ?? "").trim().length > 0 && "border-0")} contentClassName="relative px-0" label="Code" icon={Code} {...renderEditorShellProps(editorProps)}>{contentNode}</SharedBlockShell></div>;
};
const ImageBlockScene = ({ mode, block, editorProps, viewerProps }: SceneProps) => {
  const hasItems = (block.images?.length ?? 0) > 0;
  return (
    <SharedBlockShell mode={mode} className={cn("py-0 px-0", hasItems && "border-transparent")} contentClassName="px-0" label="Image" {...renderEditorShellProps(editorProps)}>
      <ImageBlockShell>
        {mode === "edit" && editorProps ? <ImageBlockContent mode="edit" urls={(block.images ?? []) as UploadedImage[]} onChange={(images) => editorProps.onUpdateBlock(block.id, { images })} initialFile={editorProps.pendingUploadFile} onConsumeInitialFile={editorProps.onConsumePendingUpload} onFilesExcess={editorProps.onFilesExcess} displayMode={editorProps.displayMode} zoom={editorProps.zoom} /> : <ImageBlockContent mode="view" urls={[]} items={(block.images ?? []) as UploadedImage[]} onFullscreenChange={viewerProps?.onGalleryFullscreenChange} displayMode={viewerProps?.displayMode} zoom={viewerProps?.zoom} />}
      </ImageBlockShell>
    </SharedBlockShell>
  );
};
const AudioBlockScene = ({ mode, block, editorProps, viewerProps }: SceneProps) => {
  const audioUrls = mode === "view" ? (block.audios ?? []).map(viewerProps?.toMediaUrl ?? ((item) => typeof item === "string" ? item : (item?.url ?? null))).filter((item): item is string => Boolean(item)) : (block.audios ?? []).map((item) => item?.url?.trim() ?? "").filter((item): item is string => item.length > 0);
  return <SharedBlockShell mode={mode} className="bg-transparent px-0 py-0" contentClassName="px-0" label="Audio" icon={Volume2} {...renderEditorShellProps(editorProps)}><div className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 shadow-sm"><AudioPlayer urls={audioUrls} /></div></SharedBlockShell>;
};
const ReferenceBlockScene = ({ mode, block, editorProps }: SceneProps) => {
  const references: ReferenceBlockData[] = sanitizeReferences(block.references ?? []);
  return (
    <SharedBlockShell mode={mode} className="bg-transparent px-0 py-0" contentClassName="px-0" label="Reference" icon={Link} {...renderEditorShellProps(editorProps)}>
      <section className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">References</div>
        {references.length > 0 ? <ul className="space-y-1.5">{references.map((reference, index) => {
          const href = reference.url?.trim() ?? ""; const label = reference.name?.trim() || href; return <li key={`${href}-${index}`} className="min-w-0">{href ? <a href={href} target="_blank" rel="noreferrer" className="block truncate text-sm text-sky-700 underline underline-offset-2 hover:text-sky-800">{label}</a> : <span className="block truncate text-sm text-slate-600">{label}</span>}</li>; })}</ul> : <div className="text-sm text-slate-400">リンクがありません</div>}
      </section>
    </SharedBlockShell>
  );
};
const MathBlockScene = ({ mode, block, meta, editorProps, viewerProps }: SceneProps) => {
  const [error, setError] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const mathData = block.math ?? { latex: "", displayMode: "block" };
  const latex = mathData.latex ?? "";
  const handleMathChange = React.useCallback((next: MathBlockData) => {
    if (next.latex.length > MAX_MATH_LATEX_LENGTH) {
      setError("KaTeX文字列が上限を超えています"); return; } setError(null); editorProps?.onUpdateBlock(block.id, { math: next }); }, [block.id, editorProps]);

  return <SharedBlockShell mode={mode} className={cn(latex.trim().length > 0 && "border-transparent")} label="Math" icon={Sigma} {...renderEditorShellProps({ ...editorProps, isBlockSelected: Boolean(editorProps?.isBlockSelected || isEditorOpen) } as EditorProps | undefined)}><div className="w-full max-w-full overflow-visible space-y-1.5 px-2 py-0.5">{renderGridOffsetSpacer(meta?.gridOffsetPx ?? 0)}<MathBlockPreviewPane latex={latex} displayMode={mathData.displayMode ?? "block"} className="rounded-lg" interactive={mode === "edit"} onActivate={mode === "edit" ? () => setIsEditorOpen(true) : undefined} showPlaceholder={mode === "edit"} placeholder={mode === "edit" ? "数式を入力..." : undefined} zoom={mode === "edit" ? editorProps?.zoom : viewerProps?.zoom} />{mode === "edit" && editorProps ? <MathEditorDialog open={isEditorOpen} onOpenChange={setIsEditorOpen} data={mathData} onChange={handleMathChange} accentColor={editorProps.accentColor} error={error} /> : null}</div></SharedBlockShell>;
};
const MarkdownBlockScene = ({ mode, block, editorProps, viewerProps }: SceneProps) => {
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const markdown = block.markdown ?? "";
  const isEmpty = markdown.trim().length === 0;
  return <SharedBlockShell mode={mode} className={cn("bg-transparent px-0 py-0", !isEmpty && "border-0")} contentClassName="px-0" label="Markdown" icon={NotebookPen} {...renderEditorShellProps({ ...editorProps, isBlockSelected: Boolean(editorProps?.isBlockSelected || isEditorOpen) } as EditorProps | undefined)}>{mode === "edit" && editorProps ? <MarkdownBlockContent mode="edit" markdown={markdown} open={isEditorOpen} onOpenChange={setIsEditorOpen} onChange={(nextMarkdown) => editorProps.onUpdateBlock(block.id, { markdown: nextMarkdown })} onReplaceWithBlocks={editorProps.onReplaceMarkdownWithBlocks} accentColor={editorProps.accentColor} zoom={editorProps.zoom} /> : <MarkdownBlockContent mode="view" markdown={markdown} zoom={viewerProps?.zoom} />}</SharedBlockShell>;
};
const CardBlockSceneRenderer = (props: CardBlockSceneRendererProps) => {
  const { block, meta } = props;

  switch (block.type) {
    case "text":
      return <TextBlockScene mode={props.mode} block={block} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    case "question":
      return <QuestionBlockScene mode={props.mode} block={block} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    case "code":
      return <CodeBlockScene mode={props.mode} block={block} meta={meta} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    case "image":
      return <ImageBlockScene mode={props.mode} block={block} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    case "audio":
      return <AudioBlockScene mode={props.mode} block={block} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    case "reference":
      return <ReferenceBlockScene mode={props.mode} block={block} editorProps={props.mode === "edit" ? props.editorProps : undefined} />;
    case "math":
      return <MathBlockScene mode={props.mode} block={block} meta={meta} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    case "markdown":
      return <MarkdownBlockScene mode={props.mode} block={block} editorProps={props.mode === "edit" ? props.editorProps : undefined} viewerProps={props.mode === "view" ? props.viewerProps : undefined} />;
    default:
      return null;
  }
};



export { CardBlockSceneRenderer };


export type { CardBlockLayoutReplaceBlock, ViewerProps, EditorProps };
