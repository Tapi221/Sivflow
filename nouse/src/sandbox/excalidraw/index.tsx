import { ReferenceSandboxPage } from "@/sandbox/reference/ReferenceSandboxPage";

const FOCUS_ITEMS = [
  "infinite canvas と viewport 操作",
  "手書き風 shape / stroke / text",
  "image support と export",
  "undo / redo と local-first autosave",
  "Sivflow の card face ink との対応",
] as const;

const LINKS = [
  {
    title: "Excalidraw",
    description: "カード面の手書き、図解、ホワイトボード UI の参考。",
    href: "https://github.com/excalidraw/excalidraw",
  },
  {
    title: "Excalidraw package",
    description: "React への組み込み方と API を確認する。",
    href: "https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation",
  },
  {
    title: "Excalidraw examples",
    description: "埋め込み時の初期データ、保存、export の実装を見る。",
    href: "https://github.com/excalidraw/excalidraw/tree/master/examples",
  },
] as const;

const ExcalidrawSandboxPage = () => {
  return (
    <ReferenceSandboxPage
      label="Excalidraw Sandbox"
      title="カード面の手書き・図解 UI の参考"
      description="Excalidraw は card face の ink、図解、教材への書き込み、ホワイトボード的な編集体験の参考にします。"
      focusItems={FOCUS_ITEMS}
      note="Sivflow では note editor の block と、手書き・図解データを同じ card face に共存させる設計の比較対象にする。"
      links={LINKS}
    />
  );
};

export { ExcalidrawSandboxPage };
