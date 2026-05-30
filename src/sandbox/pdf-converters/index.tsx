import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

type PdfConverterCandidate = {
  name: string;
  output: string;
  latexSupport: string;
  licenseNote: string;
  evaluation: string;
};

const PDF_CONVERTER_CANDIDATES: PdfConverterCandidate[] = [
  {
    name: "Manifolia pdf.js baseline",
    output: "Markdown",
    latexSupport: "PDF内テキスト抽出ベース。数式LaTeX化は未対応。",
    licenseNote: "既存実装。pdfjs-dist を使用。",
    evaluation: "このページで実際に検証可能。まず基準値として使う。",
  },
  {
    name: "MinerU",
    output: "Markdown / JSON",
    latexSupport: "数式を LaTeX に変換",
    licenseNote: "MinerU Open Source License。Apache 2.0 ベースだが追加条件あり。",
    evaluation: "最有力。PDF、画像、DOCX、PPTX、XLSX 対応。数式 LaTeX 化、表 HTML 化、OCR、CLI / FastAPI / Gradio WebUI あり。",
  },
  {
    name: "Marker",
    output: "Markdown / JSON / chunks / HTML",
    latexSupport: "数式・inline math 対応",
    licenseNote: "コードは GPL。モデル重みは修正版 OpenRAIL 系。商用セルフホストはライセンス確認必須。",
    evaluation: "Markdown 変換の有力候補。表、フォーム、数式、画像抽出に対応。",
  },
  {
    name: "Docling",
    output: "Markdown / JSON 等",
    latexSupport: "PDF 理解、表、数式、読み順対応",
    licenseNote: "コードベースは MIT ライセンス。モデルごとのライセンスは別確認。",
    evaluation: "RAG / LLM 前処理向き。汎用文書変換として使いやすい。",
  },
  {
    name: "Nougat",
    output: "Markdown 系マークアップ",
    latexSupport: "LaTeX math / tables 対応",
    licenseNote: "MIT ライセンス。",
    evaluation: "学術 PDF 向き。Meta の学術文書 PDF パーサ。更新頻度や運用安定性は要確認。",
  },
  {
    name: "olmOCR",
    output: "Markdown / plain text",
    latexSupport: "数式、表、複雑レイアウト対応",
    licenseNote: "Apache-2.0。GPU 前提の 7B VLM 系。",
    evaluation: "スキャン PDF・複雑レイアウト向き。GPU 環境があるなら候補。",
  },
  {
    name: "PyMuPDF4LLM",
    output: "Markdown / JSON / text",
    latexSupport: "Markdown 中心。数式 LaTeX 化は主目的ではない。",
    licenseNote: "AGPL-3.0。",
    evaluation: "軽量・高速・ローカル処理向き。GPU 不要、RAG 用 Markdown 化に適する。",
  },
  {
    name: "MarkItDown",
    output: "Markdown",
    latexSupport: "弱い",
    licenseNote: "MIT ライセンス。PDF 含む多形式を Markdown 化。",
    evaluation: "軽量な汎用変換向き。数式 PDF には弱め。PDF 数式 OCR の弱さが指摘されているため要検証。",
  },
];

const toMarkdownFileName = (fileName: string) => {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "pdf-extract.md";
  }

  return `${trimmed.replace(/\.pdf$/i, "")}.md`;
};

const PdfConvertersSandboxPage = () => {
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [markdown, setMarkdown] = useState("");
  const [message, setMessage] = useState("PDFを選択すると、Manifolia内のpdf.js抽出でMarkdown化を試せます。");
  const [isExtracting, setIsExtracting] = useState(false);

  const source = useMemo(() => {
    return {
      data: fileData,
      url: null,
    };
  }, [fileData]);

  const pdfDocument = usePdfDocument({
    docId: fileName ? `sandbox-pdf-converters-${fileName}` : undefined,
    source,
    onNumPages: setNumPages,
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.currentTarget.files ?? []);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("PDFファイルを選択してください。");
      return;
    }

    const buffer = await file.arrayBuffer();
    setFileName(file.name);
    setFileData(new Uint8Array(buffer));
    setMarkdown("");
    setMessage("PDFを読み込み中です。ページ数が表示されたら抽出できます。");
  };

  const handleExtractMarkdown = async () => {
    setIsExtracting(true);
    setMessage("Markdownを抽出中です。");

    try {
      const documentMarkdown = await pdfDocument.getDocumentMarkdown();
      setMarkdown(documentMarkdown.content);
      setMessage(`抽出完了: ${documentMarkdown.sections.length}ページ分のMarkdownを生成しました。`);
    } catch (errorValue) {
      const errorMessage = errorValue instanceof Error ? errorValue.message : String(errorValue);
      setMessage(`抽出に失敗しました: ${errorMessage}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!markdown) {
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = toMarkdownFileName(fileName);
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleCopyMarkdown = async () => {
    if (!markdown) {
      return;
    }

    await navigator.clipboard.writeText(markdown);
    setMessage("Markdownをクリップボードにコピーしました。");
  };

  const canExtract = Boolean(fileData) && numPages > 0 && !pdfDocument.loading && !isExtracting;

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
            PDF Converter Workbench
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            PDF / Markdown / LaTeX 変換 OSS 検証
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            ここでは GitHub リンクを眺めるだけでなく、まず Manifolia 既存の pdf.js ベース抽出で PDF から Markdown を生成します。
            外部OSS候補は、このベースラインと出力品質・速度・ライセンス・GPU要件を比較します。
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">実検証: Manifolia pdf.js baseline</h2>
            <label className="mt-5 flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-300 transition hover:border-emerald-300/60">
              <span className="font-semibold text-slate-100">PDFを選択</span>
              <span>ローカルファイルをブラウザ内で読み込み、pdf.js の text layer から Markdown を生成します。</span>
              <input className="mt-2 text-sm" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
            </label>

            <dl className="mt-5 grid gap-3 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <dt className="text-slate-400">File</dt>
                <dd className="mt-1 font-medium text-white">{fileName || "未選択"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <dt className="text-slate-400">Pages</dt>
                <dd className="mt-1 font-medium text-white">{numPages}</dd>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <dt className="text-slate-400">Status</dt>
                <dd className="mt-1 leading-6 text-slate-200">{pdfDocument.loading ? "PDF読み込み中" : message}</dd>
              </div>
            </dl>

            {pdfDocument.error && fileData ? (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                {pdfDocument.error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={!canExtract}
                onClick={handleExtractMarkdown}
              >
                Markdown抽出
              </button>
              <button
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={!markdown}
                onClick={handleCopyMarkdown}
              >
                コピー
              </button>
              <button
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={!markdown}
                onClick={handleDownloadMarkdown}
              >
                .md保存
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">抽出Markdown</h2>
              <span className="text-xs text-slate-400">{markdown.length.toLocaleString()} chars</span>
            </div>
            <pre className="mt-5 h-[520px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200">
              {markdown || "ここに抽出結果が表示されます。"}
            </pre>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-200">
                <tr>
                  <th className="px-5 py-4 font-semibold">名称</th>
                  <th className="px-5 py-4 font-semibold">主な出力</th>
                  <th className="px-5 py-4 font-semibold">LaTeX 対応</th>
                  <th className="px-5 py-4 font-semibold">ライセンス / 注意</th>
                  <th className="px-5 py-4 font-semibold">評価</th>
                </tr>
              </thead>
              <tbody>
                {PDF_CONVERTER_CANDIDATES.map((candidate) => (
                  <tr key={candidate.name} className="border-b border-slate-800 last:border-b-0">
                    <td className="px-5 py-5 align-top text-base font-semibold text-white">{candidate.name}</td>
                    <td className="px-5 py-5 align-top leading-7 text-slate-200">{candidate.output}</td>
                    <td className="px-5 py-5 align-top leading-7 text-slate-200">{candidate.latexSupport}</td>
                    <td className="px-5 py-5 align-top leading-7 text-slate-300">{candidate.licenseNote}</td>
                    <td className="px-5 py-5 align-top leading-7 text-slate-200">{candidate.evaluation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export { PdfConvertersSandboxPage };
