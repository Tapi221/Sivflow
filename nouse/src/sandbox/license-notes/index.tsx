import { ReferenceSandboxPage } from "@/sandbox/reference/ReferenceSandboxPage";

const FOCUS_ITEMS = [
  "Outline は知識ベース UI と共同編集の参考に留める",
  "Outline のライセンス条件を組み込み前に確認する",
  "tldraw は infinite canvas SDK として比較する",
  "tldraw の production 利用条件を組み込み前に確認する",
  "UI/UX 参照と依存導入を分けて判断する",
] as const;

const LINKS = [
  {
    title: "Outline",
    description: "知識ベース UI、Markdown、共同編集、チームドキュメントの参考。",
    href: "https://github.com/outline/outline",
  },
  {
    title: "tldraw",
    description: "infinite canvas、shape editor、SDK 設計の参考。",
    href: "https://github.com/tldraw/tldraw",
  },
  {
    title: "Sivflow sandbox README",
    description: "sandbox route の一覧を確認する。",
    href: "/sandbox/README.md",
  },
] as const;

const LicenseNotesSandboxPage = () => {
  return (
    <ReferenceSandboxPage
      label="License Notes Sandbox"
      title="注意付きで参考にするOSS"
      description="Outline と tldraw は設計参考として有用ですが、組み込み前にライセンスと利用条件を確認する対象です。"
      focusItems={FOCUS_ITEMS}
      note="Sivflow では依存として入れる前に、OSS としての利用可否、商用利用、production use、ライセンス変更条件を確認する。"
      links={LINKS}
    />
  );
};

export { LicenseNotesSandboxPage };
