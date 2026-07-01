type LogseqReference = {
  title: string;
  description: string;
  href: string;
};

const LOGSEQ_REFERENCES: LogseqReference[] = [
  {
    title: "Repository",
    description: "Logseq 本体のソースコード。block model、DB graph、desktop/mobile 構成を見る。",
    href: "https://github.com/logseq/logseq",
  },
  {
    title: "Documentation",
    description: "Markdown / Org-mode、PDF annotation、plugin API などの仕様確認に使う。",
    href: "https://docs.logseq.com/",
  },
  {
    title: "Plugin API",
    description: "将来 Sivflow に拡張機構を入れる場合の設計比較に使う。",
    href: "https://plugins-doc.logseq.com/",
  },
];

const LOGSEQ_FEATURES = [
  "アウトライナー形式の block",
  "ページ間リンクと backlink",
  "タグ・クエリ・グラフ導線",
  "Markdown / Org-mode ベースのローカルデータ",
  "PDF annotation と学習素材管理",
] as const;

const LogseqSandboxPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            Logseq Sandbox
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Sivflow 向け Logseq 参考ページ
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Logseq を Sivflow に組み込むのではなく、block、link、tag、graph、plugin API の設計を確認するための sandbox です。
            エディタ実装と知識ベース構造は分けて扱います。
          </p>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">参考にする構造</h2>
            <div className="mt-5 space-y-3">
              {LOGSEQ_FEATURES.map((feature) => (
                <div key={feature} className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  {feature}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">Sivflow で見る観点</h2>
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-50">
              ノートやPDFからカードを作る導線、カード同士の関連、タグ検索、復習ログを日次ノート的に表示する設計を比較対象にする。
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {LOGSEQ_REFERENCES.map((reference) => (
            <a
              key={reference.href}
              className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-emerald-300/60 hover:bg-slate-900"
              href={reference.href}
              rel="noreferrer"
              target="_blank"
            >
              <h2 className="text-lg font-semibold text-white">{reference.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{reference.description}</p>
            </a>
          ))}
        </section>
      </div>
    </div>
  );
};

export { LogseqSandboxPage };
