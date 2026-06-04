import { type ReactNode, useState } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { UserSettings } from "@/types";
import { Check, Code, Globe, Keyboard, Settings2, Shield, Type, User, Volume2 } from "@/ui/icons";
import { useUserSettings } from "./hooks/useUserSettings";
import "./SettingsWorkspaceScreen.css";

type SettingsSectionId = "account" | "preferences" | "study" | "editor" | "audio" | "about";

type SettingsSectionDefinition = {
  id: SettingsSectionId;
  label: string;
  description: string;
};

type SettingOption<T extends string | number> = {
  value: T;
  label: string;
  caption?: string;
};

type SettingsSectionBlockProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type SettingToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

type SettingSegmentProps<T extends string | number> = {
  label: string;
  description?: string;
  value: T;
  options: readonly SettingOption<T>[];
  onChange: (value: T) => void;
};

type SettingKeyValueProps = {
  label: string;
  value: ReactNode;
};

type BooleanSettingsKey = "notificationsEnabled" | "soundEnabled" | "showReviewHard" | "showReviewEasy" | "autoCarryOver" | "delayBonusEnabled" | "reviewStartNextDay" | "defaultPreviewEnabled" | "autoDraftEnabled" | "autoSaveEnabled" | "autoVoiceQuestion" | "autoVoiceAnswer";

type QuestionDisplayMode = NonNullable<UserSettings["questionDisplayMode"]>;

type MarkdownTabSize = NonNullable<UserSettings["markdownTabSize"]>;

const SETTINGS_SECTIONS: readonly SettingsSectionDefinition[] = [
  { id: "account", label: "Account", description: "プロフィールとセッション" },
  { id: "preferences", label: "Preferences", description: "表示と基本動作" },
  { id: "study", label: "Study", description: "復習の挙動" },
  { id: "editor", label: "Editor", description: "カード編集" },
  { id: "audio", label: "Audio", description: "音声と効果音" },
  { id: "about", label: "About", description: "アプリ情報" },
];
const LANGUAGE_OPTIONS = [
  { value: "ja", label: "日本語", caption: "Japanese" },
  { value: "en", label: "English", caption: "English" },
  { value: "zh", label: "中文", caption: "Chinese" },
] as const satisfies readonly SettingOption<UserSettings["language"]>[];
const WEEK_START_OPTIONS = [
  { value: "monday", label: "月曜日", caption: "Monday" },
  { value: "sunday", label: "日曜日", caption: "Sunday" },
] as const satisfies readonly SettingOption<UserSettings["weekStartDay"]>[];
const QUESTION_DISPLAY_OPTIONS = [
  { value: "tap_to_reveal", label: "タップで表示", caption: "Tap to reveal" },
  { value: "always", label: "常に表示", caption: "Always visible" },
] as const satisfies readonly SettingOption<QuestionDisplayMode>[];
const MARKDOWN_TAB_OPTIONS = [
  { value: 2, label: "2", caption: "compact" },
  { value: 4, label: "4", caption: "standard" },
  { value: 8, label: "8", caption: "wide" },
] as const satisfies readonly SettingOption<MarkdownTabSize>[];
const EMPTY_ACCOUNT_LABEL = "Not signed in";

const getAccountDisplayName = (displayName: string | null | undefined, email: string | null | undefined): string => {
  const trimmedDisplayName = displayName?.trim();
  if (trimmedDisplayName) return trimmedDisplayName;

  const emailLocalPart = email?.split("@")[0]?.trim();
  if (emailLocalPart) return emailLocalPart;

  return EMPTY_ACCOUNT_LABEL;
};

const getAccountInitial = (displayName: string): string => {
  const initial = displayName.trim().charAt(0);
  return initial ? initial.toUpperCase() : "M";
};

const getSectionIcon = (sectionId: SettingsSectionId, className: string): ReactNode => {
  if (sectionId === "account") return <User className={className} size={17} />;
  if (sectionId === "preferences") return <Globe className={className} size={17} />;
  if (sectionId === "study") return <Shield className={className} size={17} />;
  if (sectionId === "editor") return <Type className={className} size={17} />;
  if (sectionId === "audio") return <Volume2 className={className} size={17} />;
  return <Settings2 className={className} size={17} />;
};

const SettingsSectionBlock = ({ title, description, children }: SettingsSectionBlockProps) => {
  return (
    <section className="settings-workspace__section-card" aria-label={title}>
      <div className="settings-workspace__section-heading">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="settings-workspace__section-content">{children}</div>
    </section>
  );
};

const SettingToggle = ({ label, description, checked, onChange }: SettingToggleProps) => {
  return (
    <div className="settings-workspace__row">
      <div className="settings-workspace__row-copy">
        <span className="settings-workspace__row-title">{label}</span>
        {description ? <span className="settings-workspace__row-description">{description}</span> : null}
      </div>
      <button type="button" className={`settings-workspace__switch${checked ? " is-checked" : ""}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span className="settings-workspace__switch-thumb" />
      </button>
    </div>
  );
};

const SettingSegment = <T extends string | number>({ label, description, value, options, onChange }: SettingSegmentProps<T>) => {
  return (
    <div className="settings-workspace__row settings-workspace__row--stacked">
      <div className="settings-workspace__row-copy">
        <span className="settings-workspace__row-title">{label}</span>
        {description ? <span className="settings-workspace__row-description">{description}</span> : null}
      </div>
      <div className="settings-workspace__segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button key={String(option.value)} type="button" className={`settings-workspace__segment${isSelected ? " is-selected" : ""}`} role="radio" aria-checked={isSelected} onClick={() => onChange(option.value)}>
              <span className="settings-workspace__segment-label">{option.label}</span>
              {option.caption ? <span className="settings-workspace__segment-caption">{option.caption}</span> : null}
              {isSelected ? <Check className="settings-workspace__segment-check" size={14} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SettingKeyValue = ({ label, value }: SettingKeyValueProps) => {
  return (
    <div className="settings-workspace__key-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
};

const SettingsWorkspaceScreen = () => {
  const { currentUser, loading, logout } = useAuthSession();
  const { settings, updateSettings } = useUserSettings();
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("account");
  const accountName = getAccountDisplayName(currentUser?.displayName, currentUser?.email);
  const accountInitial = getAccountInitial(accountName);
  const language = settings?.language ?? "ja";
  const weekStartDay = settings?.weekStartDay ?? "monday";
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";
  const markdownTabSize = settings?.markdownTabSize ?? 2;
  const updateBooleanSetting = (key: BooleanSettingsKey, checked: boolean) => {
    void updateSettings({ [key]: checked } as Partial<UserSettings>);
  };
  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="settings-workspace" aria-label="設定">
      <aside className="settings-workspace__nav" aria-label="設定カテゴリ">
        <nav className="settings-workspace__nav-list">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = section.id === activeSectionId;
            return (
              <button key={section.id} type="button" className={`settings-workspace__nav-item${isActive ? " is-active" : ""}`} onClick={() => setActiveSectionId(section.id)} aria-current={isActive ? "page" : undefined}>
                <span className="settings-workspace__nav-icon">{getSectionIcon(section.id, "settings-workspace__nav-icon-svg")}</span>
                <span className="settings-workspace__nav-copy">
                  <span>{section.label}</span>
                  <small>{section.description}</small>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="settings-workspace__main">
        <div className="settings-workspace__content-scroll">
          {activeSectionId === "account" ? (
            <SettingsSectionBlock title="Profile" description="現在のログインセッションです。">
              <div className="settings-workspace__profile-card">
                <div className="settings-workspace__avatar" aria-hidden="true">
                  {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="" /> : <span>{accountInitial}</span>}
                </div>
                <div className="settings-workspace__profile-copy">
                  <strong>{accountName}</strong>
                  <span>{currentUser?.email ?? "メールアドレス未設定"}</span>
                </div>
                <button type="button" className="settings-workspace__secondary-button" onClick={handleLogout} disabled={loading || !currentUser}>ログアウト</button>
              </div>
              <SettingKeyValue label="Status" value={currentUser ? "Signed in" : "Guest"} />
              <SettingKeyValue label="Provider" value={currentUser?.providerData.at(0)?.providerId ?? "-"} />
              <SettingKeyValue label="User ID" value={<code>{currentUser?.uid ?? "-"}</code>} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "preferences" ? (
            <SettingsSectionBlock title="Preferences" description="画面表示と日付の基本設定です。">
              <SettingSegment label="Language" description="UI の表示言語を切り替えます。" value={language} options={LANGUAGE_OPTIONS} onChange={(value) => void updateSettings({ language: value })} />
              <SettingSegment label="Week starts on" description="カレンダー週の開始曜日です。" value={weekStartDay} options={WEEK_START_OPTIONS} onChange={(value) => void updateSettings({ weekStartDay: value })} />
              <SettingToggle label="Notifications" description="復習通知を有効にします。" checked={settings?.notificationsEnabled ?? false} onChange={(checked) => updateBooleanSetting("notificationsEnabled", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "study" ? (
            <SettingsSectionBlock title="Study" description="復習カードの表示と日送りの挙動です。">
              <SettingToggle label="Hard を表示" description="復習結果に Hard を表示します。" checked={settings?.showReviewHard ?? true} onChange={(checked) => updateBooleanSetting("showReviewHard", checked)} />
              <SettingToggle label="Easy を表示" description="復習結果に Easy を表示します。" checked={settings?.showReviewEasy ?? true} onChange={(checked) => updateBooleanSetting("showReviewEasy", checked)} />
              <SettingToggle label="未完了を持ち越す" description="未完了の復習を翌日に持ち越します。" checked={settings?.autoCarryOver ?? true} onChange={(checked) => updateBooleanSetting("autoCarryOver", checked)} />
              <SettingToggle label="遅延ボーナス" description="遅れて復習したカードの間隔補正を使います。" checked={settings?.delayBonusEnabled ?? false} onChange={(checked) => updateBooleanSetting("delayBonusEnabled", checked)} />
              <SettingToggle label="翌日から復習開始" description="新規カードの復習を翌日から開始します。" checked={settings?.reviewStartNextDay ?? true} onChange={(checked) => updateBooleanSetting("reviewStartNextDay", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "editor" ? (
            <SettingsSectionBlock title="Editor" description="カード編集画面の入力補助です。">
              <SettingSegment label="Question display" description="カード閲覧時の問題文表示方法です。" value={questionDisplayMode} options={QUESTION_DISPLAY_OPTIONS} onChange={(value) => void updateSettings({ questionDisplayMode: value })} />
              <SettingSegment label="Markdown tab size" description="Markdown 編集時のインデント幅です。" value={markdownTabSize} options={MARKDOWN_TAB_OPTIONS} onChange={(value) => void updateSettings({ markdownTabSize: value })} />
              <SettingToggle label="Preview by default" description="カード本文のプレビューを初期表示します。" checked={settings?.defaultPreviewEnabled ?? false} onChange={(checked) => updateBooleanSetting("defaultPreviewEnabled", checked)} />
              <SettingToggle label="Auto draft" description="編集中の下書きを自動で保持します。" checked={settings?.autoDraftEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoDraftEnabled", checked)} />
              <SettingToggle label="Auto save" description="編集内容を自動保存します。" checked={settings?.autoSaveEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoSaveEnabled", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "audio" ? (
            <SettingsSectionBlock title="Audio" description="学習時の音声再生と効果音です。">
              <SettingToggle label="Sound effects" description="操作音と復習結果音を有効にします。" checked={settings?.soundEnabled ?? true} onChange={(checked) => updateBooleanSetting("soundEnabled", checked)} />
              <SettingToggle label="Question voice" description="問題文を自動音声再生します。" checked={settings?.autoVoiceQuestion ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceQuestion", checked)} />
              <SettingToggle label="Answer voice" description="解答文を自動音声再生します。" checked={settings?.autoVoiceAnswer ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceAnswer", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "about" ? (
            <SettingsSectionBlock title="About FlashCard Master" description="このワークスペースで使われている基本情報です。">
              <div className="settings-workspace__about-grid">
                <div className="settings-workspace__about-card"><Settings2 size={20} /><strong>Manifolia</strong><span>FlashCard Master workspace</span></div>
                <div className="settings-workspace__about-card"><Keyboard size={20} /><strong>⌘K / Ctrl K</strong><span>Search in Workspace</span></div>
                <div className="settings-workspace__about-card"><Code size={20} /><strong>Local first</strong><span>LocalDB と同期キューを使用</span></div>
              </div>
            </SettingsSectionBlock>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export { SettingsWorkspaceScreen };
