const TagMap = () => {
  return (
    <div className="min-h-full w-full bg-[#F6F8FA] px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Tag Map
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-800">
            タグマップ
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            タグをマインドマップのように編集する画面です。まずはルートと導線だけ先に追加しています。
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-[60dvh] min-h-[480px] items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50 text-center">
              <div className="max-w-md space-y-3 px-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200/70">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="text-slate-500"
                  >
                    <path
                      d="M4.25 4.25H8M8 4.25L11.75 2.75M8 4.25L11.75 7.25M4.25 4.25V11.75"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="4.25" cy="4.25" r="1.75" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="11.75" cy="2.75" r="1.75" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="11.75" cy="7.25" r="1.75" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="4.25" cy="11.75" r="1.75" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  キャンバス準備中
                </h2>
                <p className="text-sm leading-relaxed text-slate-500">
                  次の段階で、タグをノードとして表示し、ドラッグ・接続変更・右ペイン編集を追加します。
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">予定している操作</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                ノード追加
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                ドラッグで位置変更
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                親子関係の付け替え
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                名前・色・カテゴリ編集
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default TagMap;
