type PdfConverterCandidate = {
  name: string;
  output: string;
  latexSupport: string;
  licenseNote: string;
  evaluation: string;
  href: string;
};

const PDF_CONVERTER_CANDIDATES: PdfConverterCandidate[] = [
  {
    name: "MinerU",
    output: "Markdown / JSON",
    latexSupport: "数式を LaTeX に変換",
    licenseNote: "MinerU Open Source License。Apache 2.0 ベースだが追加条件あり。",
    evaluation: "最有力。PDF、画像、DOCX、PPTX、XLSX 対応。数式 LaTeX 化、表 HTML 化、OCR、CLI / FastAPI / Gradio WebUI あり。",
    href: "https://github.com/opendatalab/MinerU",
  },
  {
    name: "Marker",
    output: "Markdown / JSON / chunks / HTML",
    latexSupport: "数式・inline math 対応",
    licenseNote: "コードは GPL。モデル重みは修正版 OpenRAIL 系。商用セルフホストはライセンス確認必須。",
    evaluation: "Markdown 変換の有力候補。表、フォーム、数式、画像抽出に対応。",
    href: "https://github.com/VikParuchuri/marker",
  },
  {
    name: "Docling",
    output: "Markdown / JSON 等",
    latexSupport: "PDF 理解、表、数式、読み順対応",
    licenseNote: "コードベースは MIT ライセンス。モデルごとのライセンスは別確認。",
    evaluation: "RAG / LLM 前処理向き。汎用文書変換として使いやすい。",
    href: "https://github.com/docling-project/docling",
  },
  {
    name: "Nougat",
    output: "Markdown 系マークアップ",
    latexSupport: "LaTeX math / tables 対応",
    licenseNote: "MIT ライセンス。",
    evaluation: "学術 PDF 向き。Meta の学術文書 PDF パーサ。更新頻度や運用安定性は要確認。",
    href: "https://github.com/facebookresearch/nougat",
  },
  {
    name: "olmOCR",
    output: "Markdown / plain text",
    latexSupport: "数式、表、複雑レイアウト対応",
    licenseNote: "Apache-2.0。GPU 前提の 7B VLM 系。",
    evaluation: "スキャン PDF・複雑レイアウト向き。GPU 環境があるなら候補。",
    href: "https://github.com/allenai/olmocr",
  },
  {
    name: "PyMuPDF4LLM",
    output: "Markdown / JSON / text",
    latexSupport: "Markdown 中心。数式 LaTeX 化は主目的ではない。",
    licenseNote: "AGPL-3.0。",
    evaluation: "軽量・高速・ローカル処理向き。GPU 不要、RAG 用 Markdown 化に適する。",
    href: "https://github.com/pymupdf/RAG",
  },
  {
    name: "MarkItDown",
    output: "Markdown",
    latexSupport: "弱い",
    licenseNote: "MIT ライセンス。PDF 含む多形式を Markdown 化。",
    evaluation: "軽量な汎用変換向き。数式 PDF には弱め。PDF 数式 OCR の弱さが指摘されているため要検証。",
    href: "https://github.com/microsoft/markitdown",
  },
];

const PdfConvertersSandboxPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
            PDF Converter Candidates
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            PDF / Markdown / LaTeX 変換 OSS 候補
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            Manifolia の PDF 教材インポート、Markdown 化、数式 LaTeX 化、OCR、RAG 前処理の候補を比較する sandbox です。
            実装に組み込む前に、出力品質、ローカル実行可否、GPU 要件、商用利用条件を個別に確認します。
          </p>
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
                  <th className="px-5 py-4 font-semibold">Link</th>
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
                    <td className="px-5 py-5 align-top">
                      <a
                        className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-emerald-500 hover:text-slate-950"
                        href={candidate.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        GitHub
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm leading-7 text-emerald-50">
          Manifolia での優先確認順は、MinerU、Marker、Docling、PyMuPDF4LLM、MarkItDown、olmOCR、Nougat。
          数式と表の保持を重視する場合は MinerU / Marker / Docling、軽量ローカル処理を重視する場合は PyMuPDF4LLM / MarkItDown を先に検証します。
        </section>
      </div>
    </div>
  );
};

export { PdfConvertersSandboxPage };
