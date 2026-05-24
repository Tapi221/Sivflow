import { Settings2, Calendar, Keyboard, Cloud, Palette } from "@/ui/icons";

const settingsSections = [
  {
    id: "study",
    title: "学習設定",
    description: "復習表示や学習開始日の既定動作を管理します。",
    icon: Calendar,
    rows: [
      ["復習カードの表示", "Hard / Easy の復習カード表示を切り替える設定です。", "有効"],
      ["翌日から復習開始", "新規カードの復習開始タイミングを翌日にします。", "有効"],
    ],
  },
  {
    id: "shortcut",
    title: "ショートカット",
    description: "よく使う操作のキーボードショートカットです。",
    icon: Keyboard,
    rows: [
      ["グローバル検索", "アプリ内の画面やカードを素早く探します。", "⌘K"],
      ["右サイドバー切り替え", "ワークスペース補助パネルを開閉します。", "⌘B"],
    ],
  },
  {
    id: "sync",
    title: "同期",
    description: "ローカルデータとクラウド同期の状態を確認します。",
    icon: Cloud,
    rows: [
      ["自動保存", "編集内容をローカルデータベースへ自動保存します。", "有効"],
      ["自動下書き", "カード編集時の下書きを自動で保持します。", "有効"],
    ],
  },
  {
    id: "display",
    title: "表示",
    description: "外観や入力体験に関する設定です。",
    icon: Palette,
    rows: [
      ["言語", "現在のアプリ表示言語です。", "日本語"],
      ["週の始まり", "カレンダーで使う週開始日です。", "月曜"],
    ],
  },
];

const SettingScreen = () => {
  return (
    <div className="ds-settings-panel flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f7f8fa] text-[#1f2937]">
      <header className="ds-settings-panel__desktop-header flex shrink-0 items-center justify-between border-b px-7 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#667085] shadow-sm ring-1 ring-black/5">
            <Settings2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold leading-7 tracking-[-0.02em] text-[#1f2937]">
              設定
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-[#667085]">
              アプリの基本設定をこのタブで確認できます。
            </p>
          </div>
        </div>
        <div className="ds-settings-panel__status-pill ds-settings-panel__status-pill--info">
          Settings
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto px-7 py-6">
        <div className="mx-auto grid w-full max-w-5xl gap-5">
          <section className="ds-settings-panel__section">
            <div className="ds-settings-panel__section-head">
              <div>
                <div className="ds-settings-panel__section-title">設定タブ</div>
                <p className="ds-settings-panel__section-description">
                  サイドバーの設定ボタンから開くワークスペースタブです。閉じる・並べ替え・再選択は他のタブと同じ操作で行えます。
                </p>
              </div>
              <span className="ds-settings-panel__status-pill ds-settings-panel__status-pill--success">
                OPEN
              </span>
            </div>
          </section>

          {settingsSections.map((section) => {
            const Icon = section.icon;

            return (
              <section key={section.id} className="ds-settings-panel__section">
                <div className="ds-settings-panel__section-head">
                  <div className="flex min-w-0 gap-3">
                    <span className="ds-settings-panel__row-leading mt-0.5">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="ds-settings-panel__section-title">
                        {section.title}
                      </div>
                      <p className="ds-settings-panel__section-description">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  {section.rows.map(([title, description, status]) => (
                    <div key={title} className="ds-settings-panel__row">
                      <div className="ds-settings-panel__row-copy">
                        <div className="ds-settings-panel__row-title">{title}</div>
                        <p className="ds-settings-panel__row-description">
                          {description}
                        </p>
                      </div>
                      <div className="ds-settings-panel__row-action">
                        <span className="ds-settings-panel__status-pill ds-settings-panel__status-pill--info">
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="ds-settings-panel__note ds-settings-panel__note--info">
            今後、各項目の編集 UI はこの設定タブ内に追加できます。
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingScreen;
