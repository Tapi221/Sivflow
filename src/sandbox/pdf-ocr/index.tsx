import { ReferenceSandboxPage } from "@/sandbox/reference/ReferenceSandboxPage";

const FOCUS_ITEMS = [
  "PDF.js の page render と text layer",
  "範囲選択、annotation、highlight",
  "PAWLS の span / relation / bounding box annotation",
  "OCR 結果の修正 UI",
  "PDF から card block へ変換する導線",
] as const;

const LINKS = [
  {
    title: "PDF.js",
    description: "PDF viewer、page render、text layer、annotation layer の参考。",
    href: "https://github.com/mozilla/pdf.js",
  },
  {
    title: "PAWLS",
    description: "PDF labeling、span annotation、relation、bounding box UI の参考。",
    href: "https://github.com/allenai/pawls",
  },
  {
    title: "Tesseract.js",
    description: "ブラウザ側 OCR と worker 処理の参考。",
    href: "https://github.com/naptha/tesseract.js",
  },
] as const;

const PdfOcrSandboxPage = () => {
  return (
    <ReferenceSandboxPage
      label="PDF / OCR Sandbox"
      title="教材インポートとPDF注釈の参考"
      description="PDF.js、PAWLS、Tesseract.js を PDF 教材からカードを作る導線の比較対象にします。"
      focusItems={FOCUS_ITEMS}
      note="Manifolia では PDF の範囲選択、OCR、注釈、抽出結果の修正、card block への変換を一連の import flow として扱う。"
      links={LINKS}
    />
  );
};

export { PdfOcrSandboxPage };
