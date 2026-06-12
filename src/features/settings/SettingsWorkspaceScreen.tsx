import "./SettingsWorkspaceScreen.css";
import { useEffect, useMemo, useState } from "react";
import type { LocalAiSettings } from "@platform/ai/localAiSettings";
import { getLocalAiSettings, setLocalAiSettings } from "@platform/ai/localAiSettings";
import { testOllamaConnection } from "@platform/ai/ollamaClient";
import type { ReactNode } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import type { StoredGoogleAccount } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import { readStoredAccounts } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import type { UserSettings } from "@/types";
import { Brain, Globe, Keyboard, Shield, Type, User, Volume2 } from "@/ui/icons";



type SettingsSectionId = "account" | "preferences" | "study" | "editor" | "audio" | "ai" | "hotkey";
type SettingsLanguage = UserSettings["language"];
type AuthSessionUser = ReturnType<typeof useAuthSession>["currentUser"];
type BooleanSettingsKey = "notificationsEnabled" | "soundEnabled" | "showReviewHard" | "showReviewEasy" | "autoCarryOver" | "delayBonusEnabled" | "reviewStartNextDay" | "defaultPreviewEnabled" | "autoDraftEnabled" | "autoSaveEnabled" | "autoVoiceQuestion" | "autoVoiceAnswer";
type QuestionDisplayMode = NonNullable<UserSettings["questionDisplayMode"]>;
type MarkdownTabSize = NonNullable<UserSettings["markdownTabSize"]>;
type LocalAiConnectionStatus = "idle" | "testing" | "connected" | "model-missing" | "failed";
type SettingsSectionDefinition = {
  id: SettingsSectionId;
  label: string;
};
type SettingOption<T extends string | number> = {
  value: T;
  label: string;
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
type SettingChoiceRowProps<T extends string | number> = {
  label: string;
  value: T;
  options: readonly SettingOption<T>[];
  onChange: (value: T) => void;
};
type SettingKeyValueProps = {
  label: string;
  value: ReactNode;
};
type SettingTextInputRowProps = {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};
type AccountProfile = {
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  providerId: string | null;
};
type SettingsWorkspaceCopy = {
  ariaLabel: string;
  navAriaLabel: string;
  sections: Record<SettingsSectionId, { label: string; }>;
  languageOptions: Record<SettingsLanguage, { label: string; }>;
  weekStartOptions: Record<UserSettings["weekStartDay"], { label: string; }>;
  questionDisplayOptions: Record<QuestionDisplayMode, { label: string; }>;
  markdownTabOptions: Record<MarkdownTabSize, { label: string; }>;
  hotkeys: readonly { label: string; keys: string; }[];
  accountProfileTitle: string;
  accountProfileDescription: string;
  emailUnset: string;
  emptyAccountLabel: string;
  logout: string;
  statusLabel: string;
  signedIn: string;
  guest: string;
  providerLabel: string;
  preferencesTitle: string;
  preferencesDescription: string;
  languageLabel: string;
  weekStartLabel: string;
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
  markdownTabLabel: string;
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
  aiTitle: string;
  aiDescription: string;
  localAiEnabledLabel: string;
  localAiEnabledDescription: string;
  localAiProviderLabel: string;
  localAiBaseUrlLabel: string;
  localAiBaseUrlDescription: string;
  localAiModelLabel: string;
  localAiModelDescription: string;
  localAiConnectionLabel: string;
  localAiTestButton: string;
  localAiStatusIdle: string;
  localAiStatusTesting: string;
  localAiStatusConnected: string;
  localAiStatusModelMissing: string;
  localAiStatusFailed: string;
  hotkeyDescription: string;
};



const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = ["account", "preferences", "study", "editor", "audio", "ai", "hotkey"];
const GOOGLE_PROVIDER_ID = "google.com";
const SETTINGS_WORKSPACE_COPY: Record<SettingsLanguage, SettingsWorkspaceCopy> = {
  ja: {
    ariaLabel: "設定",
    navAriaLabel: "設定カテゴリ",
    sections: { account: { label: "アカウント" }, preferences: { label: "環境設定" }, study: { label: "学習" }, editor: { label: "エディター" }, audio: { label: "音声" }, ai: { label: "ローカルAI" }, hotkey: { label: "Hotkey" } },
    languageOptions: { ja: { label: "日本語" }, en: { label: "English" }, zh: { label: "中文" } },
    weekStartOptions: { monday: { label: "月曜日" }, sunday: { label: "日曜日" } },
    questionDisplayOptions: { tap_to_reveal: { label: "タップで表示" }, always: { label: "常に表示" } },
    markdownTabOptions: { 2: { label: "2" }, 4: { label: "4" }, 8: { label: "8" } },
    hotkeys: [{ label: "検索を開く", keys: "⌘K / Ctrl K" }, { label: "左サイドバーを切り替え", keys: "⌘B / Ctrl B" }, { label: "右サイドバーを切り替え", keys: "⌘⇧B / Ctrl Shift B" }, { label: "カードを裏返す", keys: "Space / Enter" }, { label: "前後のカードへ移動", keys: "↑ / ↓" }],
    accountProfileTitle: "プロフィール",
    accountProfileDescription: "現在のログインセッションです。",
    emailUnset: "メールアドレス未設定",
    emptyAccountLabel: "未ログイン",
    logout: "ログアウト",
    statusLabel: "状態",
    signedIn: "ログイン中",
    guest: "ゲスト",
    providerLabel: "プロバイダー",
    preferencesTitle: "環境設定",
    preferencesDescription: "画面表示と日付の基本設定です。",
    languageLabel: "言語",
    weekStartLabel: "週の開始曜日",
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
    markdownTabLabel: "Markdown タブ幅",
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
    aiTitle: "ローカルAI",
    aiDescription: "Q&Aカード作成で使う端末ごとのローカルLLM接続です。この設定は同期しません。",
    localAiEnabledLabel: "ローカルAI回答案",
    localAiEnabledDescription: "Q&AチャットでローカルLLMを使った回答案作成を有効にします。",
    localAiProviderLabel: "プロバイダー",
    localAiBaseUrlLabel: "接続先 URL",
    localAiBaseUrlDescription: "Ollama の base URL を入力します。例: http://127.0.0.1:11434",
    localAiModelLabel: "モデル",
    localAiModelDescription: "Ollama に pull 済みのモデル名を入力します。例: llama3.2:3b",
    localAiConnectionLabel: "接続状態",
    localAiTestButton: "接続テスト",
    localAiStatusIdle: "未確認",
    localAiStatusTesting: "確認中",
    localAiStatusConnected: "接続済み",
    localAiStatusModelMissing: "接続済み / モデル未検出",
    localAiStatusFailed: "接続できませんでした",
    hotkeyDescription: "キーボード操作",
  },
  en: {
    ariaLabel: "Settings",
    navAriaLabel: "Settings categories",
    sections: { account: { label: "Account" }, preferences: { label: "Preferences" }, study: { label: "Study" }, editor: { label: "Editor" }, audio: { label: "Audio" }, ai: { label: "Local AI" }, hotkey: { label: "Hotkey" } },
    languageOptions: { ja: { label: "日本語" }, en: { label: "English" }, zh: { label: "中文" } },
    weekStartOptions: { monday: { label: "Monday" }, sunday: { label: "Sunday" } },
    questionDisplayOptions: { tap_to_reveal: { label: "Tap to reveal" }, always: { label: "Always visible" } },
    markdownTabOptions: { 2: { label: "2" }, 4: { label: "4" }, 8: { label: "8" } },
    hotkeys: [{ label: "Open search", keys: "⌘K / Ctrl K" }, { label: "Toggle left sidebar", keys: "⌘B / Ctrl B" }, { label: "Toggle right sidebar", keys: "⌘⇧B / Ctrl Shift B" }, { label: "Flip card", keys: "Space / Enter" }, { label: "Move between cards", keys: "↑ / ↓" }],
    accountProfileTitle: "Profile",
    accountProfileDescription: "Current login session.",
    emailUnset: "No email address",
    emptyAccountLabel: "Not signed in",
    logout: "Log out",
    statusLabel: "Status",
    signedIn: "Signed in",
    guest: "Guest",
    providerLabel: "Provider",
    preferencesTitle: "Preferences",
    preferencesDescription: "Basic display and date settings.",
    languageLabel: "Language",
    weekStartLabel: "Week starts on",
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
    markdownTabLabel: "Markdown tab size",
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
    aiTitle: "Local AI",
    aiDescription: "Device-local LLM connection used by Q&A card creation. This setting is not synced.",
    localAiEnabledLabel: "Local AI answers",
    localAiEnabledDescription: "Enable local LLM answer drafts in Q&A chat.",
    localAiProviderLabel: "Provider",
    localAiBaseUrlLabel: "Base URL",
    localAiBaseUrlDescription: "Enter the Ollama base URL. Example: http://127.0.0.1:11434",
    localAiModelLabel: "Model",
    localAiModelDescription: "Enter an installed Ollama model. Example: llama3.2:3b",
    localAiConnectionLabel: "Connection",
    localAiTestButton: "Test connection",
    localAiStatusIdle: "Not checked",
    localAiStatusTesting: "Checking",
    localAiStatusConnected: "Connected",
    localAiStatusModelMissing: "Connected / model not found",
    localAiStatusFailed: "Connection failed",
    hotkeyDescription: "Keyboard controls",
  },
  zh: {
    ariaLabel: "设置",
    navAriaLabel: "设置分类",
    sections: { account: { label: "账号" }, preferences: { label: "偏好设置" }, study: { label: "学习" }, editor: { label: "编辑器" }, audio: { label: "音频" }, ai: { label: "本地 AI" }, hotkey: { label: "Hotkey" } },
    languageOptions: { ja: { label: "日本語" }, en: { label: "English" }, zh: { label: "中文" } },
    weekStartOptions: { monday: { label: "星期一" }, sunday: { label: "星期日" } },
    questionDisplayOptions: { tap_to_reveal: { label: "点击显示" }, always: { label: "始终显示" } },
    markdownTabOptions: { 2: { label: "2" }, 4: { label: "4" }, 8: { label: "8" } },
    hotkeys: [{ label: "打开搜索", keys: "⌘K / Ctrl K" }, { label: "切换左侧边栏", keys: "⌘B / Ctrl B" }, { label: "切换右侧边栏", keys: "⌘⇧B / Ctrl Shift B" }, { label: "翻转卡片", keys: "Space / Enter" }, { label: "在卡片之间移动", keys: "↑ / ↓" }],
    accountProfileTitle: "个人资料",
    accountProfileDescription: "当前登录会话。",
    emailUnset: "未设置邮箱地址",
    emptyAccountLabel: "未登录",
    logout: "退出登录",
    statusLabel: "状态",
    signedIn: "已登录",
    guest: "访客",
    providerLabel: "提供商",
    preferencesTitle: "偏好设置",
    preferencesDescription: "显示和日期的基本设置。",
    languageLabel: "语言",
    weekStartLabel: "一周开始于",
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
    markdownTabLabel: "Markdown 缩进宽度",
    previewDefaultLabel: "默认预览",
    previewDefaultDescription: "默认显示卡片正文预览。",
    autoDraftLabel: "自动草稿",
    autoDraftDescription: "编辑时自动保留草稿。",
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
    aiTitle: "本地 AI",
    aiDescription: "Q&A 卡片创建使用的本机 LLM 连接。此设置不会同步。",
    localAiEnabledLabel: "本地 AI 答案",
    localAiEnabledDescription: "在 Q&A 聊天中启用本地 LLM 答案草稿。",
    localAiProviderLabel: "提供商",
    localAiBaseUrlLabel: "连接 URL",
    localAiBaseUrlDescription: "输入 Ollama base URL。例: http://127.0.0.1:11434",
    localAiModelLabel: "模型",
    localAiModelDescription: "输入已安装的 Ollama 模型。例: llama3.2:3b",
    localAiConnectionLabel: "连接状态",
    localAiTestButton: "测试连接",
    localAiStatusIdle: "未确认",
    localAiStatusTesting: "确认中",
    localAiStatusConnected: "已连接",
    localAiStatusModelMissing: "已连接 / 未找到模型",
    localAiStatusFailed: "连接失败",
    hotkeyDescription: "键盘操作",
  },
};



const buildSettingsSections = (copy: SettingsWorkspaceCopy): SettingsSectionDefinition[] => SETTINGS_SECTION_IDS.map((id) => ({ id, label: copy.sections[id].label }));
const normalizeAccountEmail = (email: string | null | undefined): string | null => {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? normalizedEmail : null;
};
const getStoredSignedInGoogleAccount = (currentUser: AuthSessionUser, storedAccounts: readonly StoredGoogleAccount[]): StoredGoogleAccount | null => {
  const userEmail = normalizeAccountEmail(currentUser?.email);
  if (!userEmail) return storedAccounts[0] ?? null;

  return storedAccounts.find((account) => normalizeAccountEmail(account.email) === userEmail) ?? null;
};
const getAccountProfile = (currentUser: AuthSessionUser, storedAccounts: readonly StoredGoogleAccount[]): AccountProfile => {
  const providerProfile = currentUser?.providerData.find((profile) => profile.providerId === GOOGLE_PROVIDER_ID) ?? currentUser?.providerData.at(0) ?? null;
  const storedAccount = getStoredSignedInGoogleAccount(currentUser, storedAccounts);

  return {
    displayName: storedAccount?.name ?? providerProfile?.displayName ?? currentUser?.displayName ?? null,
    email: storedAccount?.email ?? currentUser?.email ?? providerProfile?.email ?? null,
    photoUrl: storedAccount?.photoUrl ?? null,
    providerId: providerProfile?.providerId ?? null,
  };
};
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
const getLocalAiConnectionStatusLabel = (status: LocalAiConnectionStatus, copy: SettingsWorkspaceCopy): string => {
  if (status === "testing") return copy.localAiStatusTesting;
  if (status === "connected") return copy.localAiStatusConnected;
  if (status === "model-missing") return copy.localAiStatusModelMissing;
  if (status === "failed") return copy.localAiStatusFailed;
  return copy.localAiStatusIdle;
};
const getSectionIcon = (sectionId: SettingsSectionId, className: string): ReactNode => {
  if (sectionId === "account") return <User className={className} size={17} />;
  if (sectionId === "preferences") return <Globe className={className} size={17} />;
  if (sectionId === "study") return <Shield className={className} size={17} />;
  if (sectionId === "editor") return <Type className={className} size={17} />;
  if (sectionId === "audio") return <Volume2 className={className} size={17} />;
  if (sectionId === "ai") return <Brain className={className} size={17} />;
  if (sectionId === "hotkey") return <Keyboard className={className} size={17} />;
  return null;
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
const SettingChoiceRow = <T extends string | number,>({ label, value, options, onChange }: SettingChoiceRowProps<T>) => {
  return (
    <div className="settings-workspace__row settings-workspace__row--choice">
      <span className="settings-workspace__row-title">{label}</span>
      <div className="settings-workspace__choice-options">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button key={String(option.value)} type="button" className={`settings-workspace__choice-option${isSelected ? " is-selected" : ""}`} onClick={() => onChange(option.value)}>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
const SettingTextInputRow = ({ label, description, value, placeholder, onChange }: SettingTextInputRowProps) => {
  return (
    <div className="settings-workspace__row settings-workspace__row--input">
      <div className="settings-workspace__row-copy">
        <span className="settings-workspace__row-title">{label}</span>
        {description ? <span className="settings-workspace__row-description">{description}</span> : null}
      </div>
      <input className="settings-workspace__text-input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
  const persistedLanguage = settings?.language ?? "ja";
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("account");
  const [pendingLanguage, setPendingLanguage] = useState<SettingsLanguage | null>(null);
  const [localAiSettings, setLocalAiSettingsState] = useState<LocalAiSettings>(() => getLocalAiSettings());
  const [localAiConnectionStatus, setLocalAiConnectionStatus] = useState<LocalAiConnectionStatus>("idle");
  const language = pendingLanguage ?? persistedLanguage;
  const copy = SETTINGS_WORKSPACE_COPY[language];
  const sections = useMemo(() => buildSettingsSections(copy), [copy]);
  const storedGoogleAccounts = useMemo(() => readStoredAccounts(), [currentUser?.uid]);
  const accountProfile = useMemo(() => getAccountProfile(currentUser, storedGoogleAccounts), [currentUser, storedGoogleAccounts]);
  const languageOptions = useMemo(() => ([{ value: "ja", ...copy.languageOptions.ja }, { value: "en", ...copy.languageOptions.en }, { value: "zh", ...copy.languageOptions.zh }] as const satisfies readonly SettingOption<SettingsLanguage>[]), [copy]);
  const weekStartOptions = useMemo(() => ([{ value: "monday", ...copy.weekStartOptions.monday }, { value: "sunday", ...copy.weekStartOptions.sunday }] as const satisfies readonly SettingOption<UserSettings["weekStartDay"]>[]), [copy]);
  const questionDisplayOptions = useMemo(() => ([{ value: "tap_to_reveal", ...copy.questionDisplayOptions.tap_to_reveal }, { value: "always", ...copy.questionDisplayOptions.always }] as const satisfies readonly SettingOption<QuestionDisplayMode>[]), [copy]);
  const markdownTabOptions = useMemo(() => ([{ value: 2, ...copy.markdownTabOptions[2] }, { value: 4, ...copy.markdownTabOptions[4] }, { value: 8, ...copy.markdownTabOptions[8] }] as const satisfies readonly SettingOption<MarkdownTabSize>[]), [copy]);
  const accountName = getAccountDisplayName(accountProfile.displayName, accountProfile.email, copy.emptyAccountLabel);
  const accountInitial = getAccountInitial(accountName);
  const weekStartDay = settings?.weekStartDay ?? "monday";
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";
  const markdownTabSize = settings?.markdownTabSize ?? 2;

  const updateBooleanSetting = (key: BooleanSettingsKey, checked: boolean) => {
    void updateSettings({ [key]: checked } as Partial<UserSettings>);
  };

  const handleLanguageChange = (nextLanguage: SettingsLanguage) => {
    setPendingLanguage(nextLanguage);
    void updateSettings({ language: nextLanguage });
  };

  const handleLocalAiSettingsChange = (nextSettings: LocalAiSettings) => {
    const savedSettings = setLocalAiSettings(nextSettings);
    setLocalAiSettingsState(savedSettings);
    setLocalAiConnectionStatus("idle");
  };

  const handleLocalAiConnectionTest = async () => {
    setLocalAiConnectionStatus("testing");

    try {
      const result = await testOllamaConnection();
      setLocalAiConnectionStatus(result.modelAvailable ? "connected" : "model-missing");
    } catch {
      setLocalAiConnectionStatus("failed");
    }
  };

  const handleLogout = () => {
    void logout();
  };

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
                <span className="settings-workspace__nav-copy"><span>{section.label}</span></span>
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
                <div className="settings-workspace__avatar" aria-hidden="true">{accountProfile.photoUrl ? <img src={accountProfile.photoUrl} alt="" /> : <span>{accountInitial}</span>}</div>
                <div className="settings-workspace__profile-copy"><strong>{accountName}</strong><span>{accountProfile.email ?? copy.emailUnset}</span></div>
                <button type="button" className="settings-workspace__secondary-button" onClick={handleLogout} disabled={loading || !currentUser}>{copy.logout}</button>
              </div>
              <SettingKeyValue label={copy.statusLabel} value={currentUser ? copy.signedIn : copy.guest} />
              <SettingKeyValue label={copy.providerLabel} value={accountProfile.providerId ?? "-"} />
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "preferences" ? (
            <SettingsSectionBlock title={copy.preferencesTitle} description={copy.preferencesDescription}>
              <SettingChoiceRow label={copy.languageLabel} value={language} options={languageOptions} onChange={handleLanguageChange} />
              <SettingChoiceRow label={copy.weekStartLabel} value={weekStartDay} options={weekStartOptions} onChange={(value) => void updateSettings({ weekStartDay: value })} />
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
              <SettingChoiceRow label={copy.questionDisplayLabel} value={questionDisplayMode} options={questionDisplayOptions} onChange={(value) => void updateSettings({ questionDisplayMode: value })} />
              <SettingChoiceRow label={copy.markdownTabLabel} value={markdownTabSize} options={markdownTabOptions} onChange={(value) => void updateSettings({ markdownTabSize: value })} />
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
          {activeSectionId === "ai" ? (
            <SettingsSectionBlock title={copy.aiTitle} description={copy.aiDescription}>
              <SettingToggle label={copy.localAiEnabledLabel} description={copy.localAiEnabledDescription} checked={localAiSettings.enabled} onChange={(checked) => handleLocalAiSettingsChange({ ...localAiSettings, enabled: checked })} />
              <SettingKeyValue label={copy.localAiProviderLabel} value="Ollama" />
              <SettingTextInputRow label={copy.localAiBaseUrlLabel} description={copy.localAiBaseUrlDescription} value={localAiSettings.baseUrl} placeholder="http://127.0.0.1:11434" onChange={(value) => handleLocalAiSettingsChange({ ...localAiSettings, baseUrl: value })} />
              <SettingTextInputRow label={copy.localAiModelLabel} description={copy.localAiModelDescription} value={localAiSettings.model} placeholder="llama3.2:3b" onChange={(value) => handleLocalAiSettingsChange({ ...localAiSettings, model: value })} />
              <div className="settings-workspace__key-value">
                <span>{copy.localAiConnectionLabel}</span>
                <div className="settings-workspace__status-actions">
                  <strong>{getLocalAiConnectionStatusLabel(localAiConnectionStatus, copy)}</strong>
                  <button type="button" className="settings-workspace__secondary-button" onClick={handleLocalAiConnectionTest} disabled={localAiConnectionStatus === "testing"}>{copy.localAiTestButton}</button>
                </div>
              </div>
            </SettingsSectionBlock>
          ) : null}
          {activeSectionId === "hotkey" ? (
            <SettingsSectionBlock title={copy.sections.hotkey.label} description={copy.hotkeyDescription}>
              {copy.hotkeys.map((hotkey) => <SettingKeyValue key={hotkey.keys} label={hotkey.label} value={<code>{hotkey.keys}</code>} />)}
            </SettingsSectionBlock>
          ) : null}
        </div>
      </main>
    </div>
  );
};



export { SettingsWorkspaceScreen };
