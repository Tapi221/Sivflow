import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { UserSettings } from "@/types";
import { Check, Code, Globe, Keyboard, Settings2, Shield, Type, User, Volume2 } from "@/ui/icons";
import { useLocaleStore, type Locale } from "@shared/i18n/locale.store";
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

type SettingsLanguage = UserSettings["language"];

type QuestionDisplayMode = NonNullable<UserSettings["questionDisplayMode"]>;

type MarkdownTabSize = NonNullable<UserSettings["markdownTabSize"]>;

type SettingsSectionCopy = {
  label: string;
  description: string;
};

type LanguageOptionCopy = {
  label: string;
  caption: string;
};

type SettingsWorkspaceCopy = {
  ariaLabel: string;
  navAriaLabel: string;
  sections: Record<SettingsSectionId, SettingsSectionCopy>;
  languageOptions: Record<SettingsLanguage, LanguageOptionCopy>;
  weekStartOptions: Record<UserSettings["weekStartDay"], LanguageOptionCopy>;
  questionDisplayOptions: Record<QuestionDisplayMode, LanguageOptionCopy>;
  markdownTabOptions: Record<MarkdownTabSize, LanguageOptionCopy>;
  accountProfileTitle: string;
  accountProfileDescription: string;
  emailUnset: string;
  emptyAccountLabel: string;
  logout: string;
  statusLabel: string;
  signedIn: string;
  guest: string;
  providerLabel: string;
  userIdLabel: string;
  preferencesTitle: string;
  preferencesDescription: string;
  languageLabel: string;
  languageDescription: string;
  weekStartLabel: string;
  weekStartDescription: string;
  notificationsLabel: string;
  notificationsDescription: string;
  studyTitle: string;
  studyDescription: string;
  showHardLabel: string;
  showHardDescription: string;
  showEasyLabel: string;
  showEasyDescription: string;
  autoCarryOverLabel: string;
  autoCarryOverDescription: string;
  delayBonusLabel: string;
  delayBonusDescription: string;
  reviewStartNextDayLabel: string;
  reviewStartNextDayDescription: string;
  editorTitle: string;
  editorDescription: string;
  questionDisplayLabel: string;
  questionDisplayDescription: string;
  markdownTabLabel: string;
  markdownTabDescription: string;
  previewDefaultLabel: string;
  previewDefaultDescription: string;
  autoDraftLabel: string;
  autoDraftDescription: string;
  autoSaveLabel: string;
  autoSaveDescription: string;
  audioTitle: string;
  audioDescription: string;
  soundEffectsLabel: string;
  soundEffectsDescription: string;
  questionVoiceLabel: string;
  questionVoiceDescription: string;
  answerVoiceLabel: string;
  answerVoiceDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutWorkspaceDescription: string;
  aboutSearchDescription: string;
  aboutLocalFirstTitle: string;
  aboutLocalFirstDescription: string;
};

const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = ["account", "preferences", "study", "editor", "audio", "about"];
const SETTINGS_WORKSPACE_COPY: Record<SettingsLanguage, SettingsWorkspaceCopy> = {
  ja: {
    ariaLabel: "設定",
    navAriaLabel: "設定カテゴリ",
    sections: {
      account: { label: "アカウント", description: "プロフィールとセッション" },
      preferences: { label: "環境設定", description: "表示と基本動作" },
      study: { label: "学習", description: "復習の挙動" },
      editor: { label: "エディター", description: "カード編集" },
      audio: { label: "音声", description: "音声と効果音" },
      about: { label: "このアプリについて", description: "アプリ情報" },
    },
    languageOptions: {
      ja: { label: "日本語", caption: "日本語" },
      en: { label: "English", caption: "英語" },
      zh: { label: "中文", caption: "中国語" },
    },
    weekStartOptions: {
      monday: { label: "月曜日", caption: "月曜日" },
      sunday: { label: "日曜日", caption: "日曜日" },
    },
    questionDisplayOptions: {
      tap_to_reveal: { label: "タップで表示", caption: "タップで表示" },
      always: { label: "常に表示", caption: "常に表示" },
    },
    markdownTabOptions: {
      2: { label: "2", caption: "コンパクト" },
      4: { label: "4", caption: "標準" },
      8: { label: "8", caption: "広め" },
    },
    accountProfileTitle: "プロフィール",
    accountProfileDescription: "現在のログインセッションです。",
    emailUnset: "メールアドレス未設定",
    emptyAccountLabel: "未ログイン",
    logout: "ログアウト",
    statusLabel: "状態",
    signedIn: "ログイン中",
    guest: "ゲスト",
    providerLabel: "プロバイダー",
    userIdLabel: "ユーザー ID",
    preferencesTitle: "環境設定",
    preferencesDescription: "画面表示と日付の基本設定です。",
    languageLabel: "言語",
    languageDescription: "UI の表示言語を切り替えます。",
    weekStartLabel: "週の開始曜日",
    weekStartDescription: "カレンダー週の開始曜日です。",
    notificationsLabel: "通知",
    notificationsDescription: "復習通知を有効にします。",
    studyTitle: "学習",
    studyDescription: "復習カードの表示と日送りの挙動です。",
    showHardLabel: "Hard を表示",
    showHardDescription: "復習結果に Hard を表示します。",
    showEasyLabel: "Easy を表示",
    showEasyDescription: "復習結果に Easy を表示します。",
    autoCarryOverLabel: "未完了を持ち越す",
    autoCarryOverDescription: "未完了の復習を翌日に持ち越します。",
    delayBonusLabel: "遅延ボーナス",
    delayBonusDescription: "遅れて復習したカードの間隔補正を使います。",
    reviewStartNextDayLabel: "翌日から復習開始",
    reviewStartNextDayDescription: "新規カードの復習を翌日から開始します。",
    editorTitle: "エディター",
    editorDescription: "カード編集画面の入力補助です。",
    questionDisplayLabel: "問題文の表示",
    questionDisplayDescription: "カード閲覧時の問題文表示方法です。",
    markdownTabLabel: "Markdown タブ幅",
    markdownTabDescription: "Markdown 編集時のインデント幅です。",
    previewDefaultLabel: "プレビューを初期表示",
    previewDefaultDescription: "カード本文のプレビューを初期表示します。",
    autoDraftLabel: "下書きの自動保持",
    autoDraftDescription: "編集中の下書きを自動で保持します。",
    autoSaveLabel: "自動保存",
    autoSaveDescription: "編集内容を自動保存します。",
    audioTitle: "音声",
    audioDescription: "学習時の音声再生と効果音です。",
    soundEffectsLabel: "効果音",
    soundEffectsDescription: "操作音と復習結果音を有効にします。",
    questionVoiceLabel: "問題文の音声",
    questionVoiceDescription: "問題文を自動音声再生します。",
    answerVoiceLabel: "解答文の音声",
    answerVoiceDescription: "解答文を自動音声再生します。",
    aboutTitle: "FlashCard Master について",
    aboutDescription: "このワークスペースで使われている基本情報です。",
    aboutWorkspaceDescription: "FlashCard Master ワークスペース",
    aboutSearchDescription: "ワークスペース内検索",
    aboutLocalFirstTitle: "ローカル優先",
    aboutLocalFirstDescription: "LocalDB と同期キューを使用",
  },
  en: {
    ariaLabel: "Settings",
    navAriaLabel: "Settings categories",
    sections: {
      account: { label: "Account", description: "Profile and session" },
      preferences: { label: "Preferences", description: "Display and basic behavior" },
      study: { label: "Study", description: "Review behavior" },
      editor: { label: "Editor", description: "Card editing" },
      audio: { label: "Audio", description: "Voice and sound effects" },
      about: { label: "About", description: "App information" },
    },
    languageOptions: {
      ja: { label: "日本語", caption: "Japanese" },
      en: { label: "English", caption: "English" },
      zh: { label: "中文", caption: "Chinese" },
    },
    weekStartOptions: {
      monday: { label: "Monday", caption: "Monday" },
      sunday: { label: "Sunday", caption: "Sunday" },
    },
    questionDisplayOptions: {
      tap_to_reveal: { label: "Tap to reveal", caption: "Tap to reveal" },
      always: { label: "Always visible", caption: "Always visible" },
    },
    markdownTabOptions: {
      2: { label: "2", caption: "compact" },
      4: { label: "4", caption: "standard" },
      8: { label: "8", caption: "wide" },
    },
    accountProfileTitle: "Profile",
    accountProfileDescription: "Current login session.",
    emailUnset: "No email address",
    emptyAccountLabel: "Not signed in",
    logout: "Log out",
    statusLabel: "Status",
    signedIn: "Signed in",
    guest: "Guest",
    providerLabel: "Provider",
    userIdLabel: "User ID",
    preferencesTitle: "Preferences",
    preferencesDescription: "Basic display and date settings.",
    languageLabel: "Language",
    languageDescription: "Change the UI language.",
    weekStartLabel: "Week starts on",
    weekStartDescription: "First day of the calendar week.",
    notificationsLabel: "Notifications",
    notificationsDescription: "Enable review notifications.",
    studyTitle: "Study",
    studyDescription: "Review card display and carry-over behavior.",
    showHardLabel: "Show Hard",
    showHardDescription: "Show Hard in review results.",
    showEasyLabel: "Show Easy",
    showEasyDescription: "Show Easy in review results.",
    autoCarryOverLabel: "Carry over unfinished reviews",
    autoCarryOverDescription: "Move unfinished reviews to the next day.",
    delayBonusLabel: "Delay bonus",
    delayBonusDescription: "Apply interval correction for overdue cards.",
    reviewStartNextDayLabel: "Start reviews next day",
    reviewStartNextDayDescription: "Start reviewing new cards from the next day.",
    editorTitle: "Editor",
    editorDescription: "Input assistance for card editing.",
    questionDisplayLabel: "Question display",
    questionDisplayDescription: "How questions are displayed while viewing cards.",
    markdownTabLabel: "Markdown tab size",
    markdownTabDescription: "Indent width for Markdown editing.",
    previewDefaultLabel: "Preview by default",
    previewDefaultDescription: "Show the card body preview by default.",
    autoDraftLabel: "Auto draft",
    autoDraftDescription: "Keep drafts automatically while editing.",
    autoSaveLabel: "Auto save",
    autoSaveDescription: "Save edits automatically.",
    audioTitle: "Audio",
    audioDescription: "Voice playback and sound effects during study.",
    soundEffectsLabel: "Sound effects",
    soundEffectsDescription: "Enable operation and review result sounds.",
    questionVoiceLabel: "Question voice",
    questionVoiceDescription: "Automatically play question text audio.",
    answerVoiceLabel: "Answer voice",
    answerVoiceDescription: "Automatically play answer text audio.",
    aboutTitle: "About FlashCard Master",
    aboutDescription: "Basic information used in this workspace.",
    aboutWorkspaceDescription: "FlashCard Master workspace",
    aboutSearchDescription: "Search in Workspace",
    aboutLocalFirstTitle: "Local first",
    aboutLocalFirstDescription: "Uses LocalDB and sync queue",
  },
  zh: {
    ariaLabel: "设置",
    navAriaLabel: "设置分类",
    sections: {
      account: { label: "账号", description: "个人资料和会话" },
      preferences: { label: "偏好设置", description: "显示和基本行为" },
      study: { label: "学习", description: "复习行为" },
      editor: { label: "编辑器", description: "卡片编辑" },
      audio: { label: "音频", description: "语音和音效" },
      about: { label: "关于", description: "应用信息" },
    },
    languageOptions: {
      ja: { label: "日本語", caption: "日语" },
      en: { label: "English", caption: "英语" },
      zh: { label: "中文", caption: "中文" },
    },
    weekStartOptions: {
      monday: { label: "星期一", caption: "星期一" },
      sunday: { label: "星期日", caption: "星期日" },
    },
    questionDisplayOptions: {
      tap_to_reveal: { label: "点击显示", caption: "点击显示" },
      always: { label: "始终显示", caption: "始终显示" },
    },
    markdownTabOptions: {
      2: { label: "2", caption: "紧凑" },
      4: { label: "4", caption: "标准" },
      8: { label: "8", caption: "宽" },
    },
    accountProfileTitle: "个人资料",
    accountProfileDescription: "当前登录会话。",
    emailUnset: "未设置邮箱地址",
    emptyAccountLabel: "未登录",
    logout: "退出登录",
    statusLabel: "状态",
    signedIn: "已登录",
    guest: "访客",
    providerLabel: "提供商",
    userIdLabel: "用户 ID",
    preferencesTitle: "偏好设置",
    preferencesDescription: "显示和日期的基本设置。",
    languageLabel: "语言",
    languageDescription: "切换 UI 显示语言。",
    weekStartLabel: "一周开始于",
    weekStartDescription: "日历周的开始日。",
    notificationsLabel: "通知",
    notificationsDescription: "启用复习通知。",
    studyTitle: "学习",
    studyDescription: "复习卡片显示和日期转移行为。",
    showHardLabel: "显示 Hard",
    showHardDescription: "在复习结果中显示 Hard。",
    showEasyLabel: "显示 Easy",
    showEasyDescription: "在复习结果中显示 Easy。",
    autoCarryOverLabel: "结转未完成复习",
    autoCarryOverDescription: "将未完成的复习结转到第二天。",
    delayBonusLabel: "延迟奖励",
    delayBonusDescription: "为逾期复习的卡片使用间隔修正。",
    reviewStartNextDayLabel: "次日开始复习",
    reviewStartNextDayDescription: "新卡片从第二天开始复习。",
    editorTitle: "编辑器",
    editorDescription: "卡片编辑界面的输入辅助。",
    questionDisplayLabel: "问题显示",
    questionDisplayDescription: "查看卡片时的问题显示方式。",
    markdownTabLabel: "Markdown 缩进宽度",
    markdownTabDescription: "Markdown 编辑时的缩进宽度。",
    previewDefaultLabel: "默认预览",
    previewDefaultDescription: "默认显示卡片正文预览。",
    autoDraftLabel: "自动草稿",
    autoDraftDescription: "编辑时自动保留下稿。",
    autoSaveLabel: "自动保存",
    autoSaveDescription: "自动保存编辑内容。",
    audioTitle: "音频",
    audioDescription: "学习时的语音播放和音效。",
    soundEffectsLabel: "音效",
    soundEffectsDescription: "启用操作音和复习结果音。",
    questionVoiceLabel: "问题语音",
    questionVoiceDescription: "自动播放问题文本语音。",
    answerVoiceLabel: "答案语音",
    answerVoiceDescription: "自动播放答案文本语音。",
    aboutTitle: "关于 FlashCard Master",
    aboutDescription: "此工作区使用的基本信息。",
    aboutWorkspaceDescription: "FlashCard Master 工作区",
    aboutSearchDescription: "在工作区中搜索",
    aboutLocalFirstTitle: "本地优先",
    aboutLocalFirstDescription: "使用 LocalDB 和同步队列",
  },
};

const getSupportedLocale = (language: SettingsLanguage): Locale => language === "ja" ? "ja" : "en";

const buildSettingsSections = (copy: SettingsWorkspaceCopy): SettingsSectionDefinition[] => SETTINGS_SECTION_IDS.map((id) => ({ id, ...copy.sections[id] }));

const getAccountDisplayName = (displayName: string | null | undefined, email: string | null | undefined, fallbackLabel: string): string => {
  const trimmedDisplayName = displayName?.trim();
  if (trimmedDisplayName) return trimmedDisplayName;

  const emailLocalPart = email?.split("@")[0]?.trim();
  if (emailLocalPart) return emailLocalPart;

  return fallbackLabel;
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
  const setLocale = useLocaleStore((state) => state.setLocale);
  const persistedLanguage = settings?.language ?? "ja";
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("account");
  const [pendingLanguage, setPendingLanguage] = useState<SettingsLanguage | null>(null);
  const language = pendingLanguage ?? persistedLanguage;
  const copy = SETTINGS_WORKSPACE_COPY[language];
  const sections = useMemo(() => buildSettingsSections(copy), [copy]);
  const languageOptions = useMemo(() => ([
    { value: "ja", ...copy.languageOptions.ja },
    { value: "en", ...copy.languageOptions.en },
    { value: "zh", ...copy.languageOptions.zh },
  ] as const satisfies readonly SettingOption<SettingsLanguage>[]), [copy]);
  const weekStartOptions = useMemo(() => ([
    { value: "monday", ...copy.weekStartOptions.monday },
    { value: "sunday", ...copy.weekStartOptions.sunday },
  ] as const satisfies readonly SettingOption<UserSettings["weekStartDay"]>[]), [copy]);
  const questionDisplayOptions = useMemo(() => ([
    { value: "tap_to_reveal", ...copy.questionDisplayOptions.tap_to_reveal },
    { value: "always", ...copy.questionDisplayOptions.always },
  ] as const satisfies readonly SettingOption<QuestionDisplayMode>[]), [copy]);
  const markdownTabOptions = useMemo(() => ([
    { value: 2, ...copy.markdownTabOptions[2] },
    { value: 4, ...copy.markdownTabOptions[4] },
    { value: 8, ...copy.markdownTabOptions[8] },
  ] as const satisfies readonly SettingOption<MarkdownTabSize>[]), [copy]);
  const accountName = getAccountDisplayName(currentUser?.displayName, currentUser?.email, copy.emptyAccountLabel);
  const accountInitial = getAccountInitial(accountName);
  const weekStartDay = settings?.weekStartDay ?? "monday";
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";
  const markdownTabSize = settings?.markdownTabSize ?? 2;
  const updateBooleanSetting = (key: BooleanSettingsKey, checked: boolean) => {
    void updateSettings({ [key]: checked } as Partial<UserSettings>);
  };
  const handleLanguageChange = (nextLanguage: SettingsLanguage) => {
    setPendingLanguage(nextLanguage);
    setLocale(getSupportedLocale(nextLanguage));
    void updateSettings({ language: nextLanguage });
  };
  const handleLogout = () => {
    void logout();
  };

  useEffect(() => {
    setLocale(getSupportedLocale(persistedLanguage));
  }, [persistedLanguage, setLocale]);

  useEffect(() => {
    if (pendingLanguage === null || pendingLanguage !== persistedLanguage) return;
    setPendingLanguage(null);
  }, [pendingLanguage, persistedLanguage]);

  return (
    <div className="settings-workspace" aria-label={copy.ariaLabel}>
      <aside className="settings-workspace__nav" aria-label={copy.navAriaLabel}>
        <nav className="settings-workspace__nav-list">
          {sections.map((section) => {
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
            <SettingsSectionBlock title={copy.accountProfileTitle} description={copy.accountProfileDescription}>
              <div className="settings-workspace__profile-card">
                <div className="settings-workspace__avatar" aria-hidden="true">
                  {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="" /> : <span>{accountInitial}</span>}
                </div>
                <div className="settings-workspace__profile-copy">
                  <strong>{accountName}</strong>
                  <span>{currentUser?.email ?? copy.emailUnset}</span>
                </div>
                <button type="button" className="settings-workspace__secondary-button" onClick={handleLogout} disabled={loading || !currentUser}>{copy.logout}</button>
              </div>
              <SettingKeyValue label={copy.statusLabel} value={currentUser ? copy.signedIn : copy.guest} />
              <SettingKeyValue label={copy.providerLabel} value={currentUser?.providerData.at(0)?.providerId ?? "-"} />
              <SettingKeyValue label={copy.userIdLabel} value={<code>{currentUser?.uid ?? "-"}</code>} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "preferences" ? (
            <SettingsSectionBlock title={copy.preferencesTitle} description={copy.preferencesDescription}>
              <SettingSegment label={copy.languageLabel} description={copy.languageDescription} value={language} options={languageOptions} onChange={handleLanguageChange} />
              <SettingSegment label={copy.weekStartLabel} description={copy.weekStartDescription} value={weekStartDay} options={weekStartOptions} onChange={(value) => void updateSettings({ weekStartDay: value })} />
              <SettingToggle label={copy.notificationsLabel} description={copy.notificationsDescription} checked={settings?.notificationsEnabled ?? false} onChange={(checked) => updateBooleanSetting("notificationsEnabled", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "study" ? (
            <SettingsSectionBlock title={copy.studyTitle} description={copy.studyDescription}>
              <SettingToggle label={copy.showHardLabel} description={copy.showHardDescription} checked={settings?.showReviewHard ?? true} onChange={(checked) => updateBooleanSetting("showReviewHard", checked)} />
              <SettingToggle label={copy.showEasyLabel} description={copy.showEasyDescription} checked={settings?.showReviewEasy ?? true} onChange={(checked) => updateBooleanSetting("showReviewEasy", checked)} />
              <SettingToggle label={copy.autoCarryOverLabel} description={copy.autoCarryOverDescription} checked={settings?.autoCarryOver ?? true} onChange={(checked) => updateBooleanSetting("autoCarryOver", checked)} />
              <SettingToggle label={copy.delayBonusLabel} description={copy.delayBonusDescription} checked={settings?.delayBonusEnabled ?? false} onChange={(checked) => updateBooleanSetting("delayBonusEnabled", checked)} />
              <SettingToggle label={copy.reviewStartNextDayLabel} description={copy.reviewStartNextDayDescription} checked={settings?.reviewStartNextDay ?? true} onChange={(checked) => updateBooleanSetting("reviewStartNextDay", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "editor" ? (
            <SettingsSectionBlock title={copy.editorTitle} description={copy.editorDescription}>
              <SettingSegment label={copy.questionDisplayLabel} description={copy.questionDisplayDescription} value={questionDisplayMode} options={questionDisplayOptions} onChange={(value) => void updateSettings({ questionDisplayMode: value })} />
              <SettingSegment label={copy.markdownTabLabel} description={copy.markdownTabDescription} value={markdownTabSize} options={markdownTabOptions} onChange={(value) => void updateSettings({ markdownTabSize: value })} />
              <SettingToggle label={copy.previewDefaultLabel} description={copy.previewDefaultDescription} checked={settings?.defaultPreviewEnabled ?? false} onChange={(checked) => updateBooleanSetting("defaultPreviewEnabled", checked)} />
              <SettingToggle label={copy.autoDraftLabel} description={copy.autoDraftDescription} checked={settings?.autoDraftEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoDraftEnabled", checked)} />
              <SettingToggle label={copy.autoSaveLabel} description={copy.autoSaveDescription} checked={settings?.autoSaveEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoSaveEnabled", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "audio" ? (
            <SettingsSectionBlock title={copy.audioTitle} description={copy.audioDescription}>
              <SettingToggle label={copy.soundEffectsLabel} description={copy.soundEffectsDescription} checked={settings?.soundEnabled ?? true} onChange={(checked) => updateBooleanSetting("soundEnabled", checked)} />
              <SettingToggle label={copy.questionVoiceLabel} description={copy.questionVoiceDescription} checked={settings?.autoVoiceQuestion ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceQuestion", checked)} />
              <SettingToggle label={copy.answerVoiceLabel} description={copy.answerVoiceDescription} checked={settings?.autoVoiceAnswer ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceAnswer", checked)} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "about" ? (
            <SettingsSectionBlock title={copy.aboutTitle} description={copy.aboutDescription}>
              <div className="settings-workspace__about-grid">
                <div className="settings-workspace__about-card"><Settings2 size={20} /><strong>Manifolia</strong><span>{copy.aboutWorkspaceDescription}</span></div>
                <div className="settings-workspace__about-card"><Keyboard size={20} /><strong>⌘K / Ctrl K</strong><span>{copy.aboutSearchDescription}</span></div>
                <div className="settings-workspace__about-card"><Code size={20} /><strong>{copy.aboutLocalFirstTitle}</strong><span>{copy.aboutLocalFirstDescription}</span></div>
              </div>
            </SettingsSectionBlock>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export { SettingsWorkspaceScreen };
