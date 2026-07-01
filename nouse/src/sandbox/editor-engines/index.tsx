import { ReferenceSandboxPage } from "@/sandbox/reference/ReferenceSandboxPage";

const FOCUS_ITEMS = [
  "Tiptap の headless editor と extension model",
  "Plate の plugin / shadcn/ui / Notion-like template",
  "Milkdown の ProseMirror / remark / Markdown pipeline",
  "schema、serialization、toolbar、slash command の差分",
] as const;

const LINKS = [
  {
    title: "Tiptap",
    description: "ProseMirror ベースの headless rich text editor。extension 設計を見る。",
    href: "https://github.com/ueberdosis/tiptap",
  },
  {
    title: "Plate",
    description: "plugin 構成、AI、shadcn/ui、Notion-like editor の参考。",
    href: "https://github.com/udecode/plate",
  },
  {
    title: "Milkdown",
    description: "ProseMirror と remark を使う WYSIWYG Markdown editor の参考。",
    href: "https://github.com/Milkdown/milkdown",
  },
] as const;

const EditorEnginesSandboxPage = () => {
  return (
    <ReferenceSandboxPage
      label="Editor Engines Sandbox"
      title="Tiptap / Plate / Milkdown の比較"
      description="schema、extension、serialization、UI plugin の設計差分を見るための sandbox です。"
      focusItems={FOCUS_ITEMS}
      note="Sivflow ではカード面の block 構造、Markdown 変換、slash command、toolbar、media block の拡張方式を比較する。"
      links={LINKS}
    />
  );
};

export { EditorEnginesSandboxPage };
