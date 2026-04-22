import React from "react";

const Dictionary = () => {
  return (
    <div className="h-full overflow-y-auto px-6 py-6 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Dictionary
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-800">辞書</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            用語・定義・関連カードをまとめる画面です。現段階ではシェルのみ先行配置しています。
          </p>
        </section>

        <section className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-sm leading-relaxed text-slate-500">
          辞書データの一覧と検索 UI は次の実装対象です。
        </section>
      </div>
    </div>
  );
};

export default Dictionary;
