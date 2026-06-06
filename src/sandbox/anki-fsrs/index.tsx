import { ReferenceSandboxPage } from "@/sandbox/reference/ReferenceSandboxPage";

const FOCUS_ITEMS = [
  "Anki の note / card / deck model",
  "FSRS の scheduler と optimizer",
  "review log と記憶パラメータ",
  "Sivflow の reviewProgressIncluded capability との対応",
  "復習間隔、難易度、忘却率の扱い",
] as const;

const LINKS = [
  {
    title: "Anki",
    description: "フラッシュカード本体、deck、note type、scheduler 周辺の参考。",
    href: "https://github.com/ankitects/anki",
  },
  {
    title: "FSRS4Anki",
    description: "Free Spaced Repetition Scheduler の scheduler / optimizer 実装を見る。",
    href: "https://github.com/open-spaced-repetition/fsrs4anki",
  },
  {
    title: "Open Spaced Repetition",
    description: "FSRS 系の関連実装と仕様確認に使う。",
    href: "https://github.com/open-spaced-repetition",
  },
] as const;

const AnkiFsrsSandboxPage = () => {
  return (
    <ReferenceSandboxPage
      label="Anki + FSRS4Anki Sandbox"
      title="復習スケジューラとカード設計の参考"
      description="Anki はフラッシュカード本体の設計、FSRS4Anki は復習間隔と記憶パラメータの最適化を見るための sandbox です。"
      focusItems={FOCUS_ITEMS}
      note="Sivflow ではカード作成 UI だけでなく、復習履歴、次回出題日、難易度、忘却率を domain model として扱うための参考にする。"
      links={LINKS}
    />
  );
};

export { AnkiFsrsSandboxPage };
