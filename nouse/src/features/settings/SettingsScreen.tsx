import { useEffect, useMemo, useState } from "react";
import type { LocalAiSettings } from "@platform/ai/localAiSettings";
import { getLocalAiSettings, setLocalAiSettings } from "@platform/ai/localAiSettings";
import { testOllamaConnection } from "@platform/ai/ollamaClient";
import { Brain, ChevronDown, Globe, Keyboard, Shield, Type, User, Volume2 } from "@web-renderer/chip/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@web-renderer/chip/panel/dropdown-menu";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import type { StoredGoogleAccount } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import { readStoredAccounts } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import type { UserSettings } from "@/types";



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
  sections: Record<SettingsSectionId, { label: string }>;
  languageOptions: Record<SettingsLanguage, { label: string }>;
  weekStartOptions: Record<UserSettings["weekStartDay"], { label: string }>;
  questionDisplayOptions: Record<QuestionDisplayMode, { label: string }>;
  markdownTabOptions: Record<MarkdownTabSize, { label: string }>;
  hotkeys: readonly { label: string; keys: string }[];
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
    delayBonusDescription: "Use interval adjustment for overdue cards.",
    reviewStartNextDayLabel: "Start review next day",
    reviewStartNextDayDescription: "Start reviewing new cards from the next day.",
    editorTitle: "Editor",
    editorDescription: "Input assistance for card editing.",
    questionDisplayLabel: "Question display",
    markdownTabLabel: "Markdown tab width",
    previewDefaultLabel: "Show preview by default",
    previewDefaultDescription: "Open the card body preview by default.",
    autoDraftLabel: "Auto keep drafts",
    autoDraftDescription: "Keep editing drafts automatically.",
    autoSaveLabel: "Auto save",
    autoSaveDescription: "Save edits automatically.",
    audioTitle: "Audio",
    audioDescription: "Study audio playback and sound effects.",
    soundEffectsLabel: "Sound effects",
    soundEffectsDescription: "Enable operation and review result sounds.",
    questionVoiceLabel: "Question voice",
    questionVoiceDescription: "Automatically play question text audio.",
    answerVoiceLabel: "Answer voice",
    answerVoiceDescription: "Automatically play answer text audio.",
    aiTitle: "Local AI",
    aiDescription: "Per-device local LLM connection for Q&A card creation. This setting does not sync.",
    localAiEnabledLabel: "Local AI answer suggestions",
    localAiEnabledDescription: "Enable local LLM answer suggestions in Q&A chat.",
    localAiProviderLabel: "Provider",
    localAiBaseUrlLabel: "Base URL",
    localAiBaseUrlDescription: "Enter the Ollama base URL. Example: http://127.0.0.1:11434",
    localAiModelLabel: "Model",
    localAiModelDescription: "Enter the model name already pulled in Ollama. Example: llama3.2:3b",
    localAiConnectionLabel: "Connection",
    localAiTestButton: "Test connection",
    localAiStatusIdle: "Not checked",
    localAiStatusTesting: "Checking",
    localAiStatusConnected: "Connected",
    localAiStatusModelMissing: "Connected / model not found",
    localAiStatusFailed: "Could not connect",
    hotkeyDescription: "Keyboard shortcuts",
  },
  zh: {
    ariaLabel: "设置",
    navAriaLabel: "设置类别",
    sections: { account: { label: "账户" }, preferences: { label: "偏好设置" }, study: { label: "学习" }, editor: { label: "编辑器" }, audio: { label: "音频" }, ai: { label: "本地 AI" }, hotkey: { label: "快捷键" } },
    languageOptions: { ja: { label: "日本語" }, en: { label: "English" }, zh: { label: "中文" } },
    weekStartOptions: { monday: { label: "星期一" }, sunday: { label: "星期日" } },
    questionDisplayOptions: { tap_to_reveal: { label: "点击显示" }, always: { label: "始终显示" } },
    markdownTabOptions: { 2: { label: "2" }, 4: { label: "4" }, 8: { label: "8" } },
    hotkeys: [{ label: "打开搜索", keys: "⌘K / Ctrl K" }, { label: "切换左侧栏", keys: "⌘B / Ctrl B" }, { label: "切换右侧栏", keys: "⌘⇧B / Ctrl Shift B" }, { label: "翻转卡片", keys: "Space / Enter" }, { label: "移动卡片", keys: "↑ / ↓" }],
    accountProfileTitle: "个人资料",
    accountProfileDescription: "当前登录会话。",
    emailUnset: "未设置邮箱地址",
    emptyAccountLabel: "未登录",
    logout: "退出登录",
    statusLabel: "状态",
    signedIn: "已登录",
    guest: "访客",
    providerLabel: "提供方",
    preferencesTitle: "偏好设置",
    preferencesDescription: "显示和日期的基础设置。",
    languageLabel: "语言",
    weekStartLabel: "每周开始日",
    notificationsLabel: "通知",
    notificationsDescription: "启用复习通知。",
    studyTitle: "学习",
    studyDescription: "复习卡片显示和顺延行为。",
    showHardLabel: "显示 Hard",
    showHardDescription: "在复习结果中显示 Hard。",
    showEasyLabel: "显示 Easy",
    showEasyDescription: "在复习结果中显示 Easy。",
    autoCarryOverLabel: "顺延未完成内容",
    autoCarryOverDescription: "将未完成的复习顺延到次日。",
    delayBonusLabel: "延迟奖励",
    delayBonusDescription: "对逾期复习的卡片使用间隔修正。",
    reviewStartNextDayLabel: "次日开始复习",
    reviewStartNextDayDescription: "新卡片从次日开始复习。",
    editorTitle: "编辑器",
    editorDescription: "卡片编辑界面的输入辅助。",
    questionDisplayLabel: "问题显示",
    markdownTabLabel: "Markdown 制表宽度",
    previewDefaultLabel: "默认显示预览",
    previewDefaultDescription: "默认打开卡片正文预览。",
    autoDraftLabel: "自动保留草稿",
    autoDraftDescription: "自动保留编辑中的草稿。",
    autoSaveLabel: "自动保存",
    autoSaveDescription: "自动保存编辑内容。",
    audioTitle: "音频",
    audioDescription: "学习时的音频播放和音效。",
    soundEffectsLabel: "音效",
    soundEffectsDescription: "启用操作音和复习结果音。",
    questionVoiceLabel: "问题语音",
    questionVoiceDescription: "自动播放问题文本语音。",
    answerVoiceLabel: "答案语音",
    answerVoiceDescription: "自动播放答案文本语音。",
    aiTitle: "本地 AI",
    aiDescription: "Q&A 卡片创建使用的每设备本地 LLM 连接。此设置不会同步。",
    localAiEnabledLabel: "本地 AI 答案建议",
    localAiEnabledDescription: "在 Q&A 聊天中启用本地 LLM 答案建议。",
    localAiProviderLabel: "提供方",
    localAiBaseUrlLabel: "连接 URL",
    localAiBaseUrlDescription: "输入 Ollama base URL。例: http://127.0.0.1:11434",
    localAiModelLabel: "模型",
    localAiModelDescription: "输入已在 Ollama pull 的模型名。例: llama3.2:3b",
    localAiConnectionLabel: "连接状态",
    localAiTestButton: "连接测试",
    localAiStatusIdle: "未确认",
    localAiStatusTesting: "确认中",
    localAiStatusConnected: "已连接",
    localAiStatusModelMissing: "已连接 / 未检测到模型",
    localAiStatusFailed: "无法连接",
    hotkeyDescription: "键盘快捷键",
  },
};
const SETTINGS_NAV_ICON_CLASS_NAME = "h-4 w-4";



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
const getSectionIcon = (sectionId: SettingsSectionId): ReactNode => {
  if (sectionId === "account") return <User className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  if (sectionId === "preferences") return <Globe className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  if (sectionId === "study") return <Shield className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  if (sectionId === "editor") return <Type className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  if (sectionId === "audio") return <Volume2 className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  if (sectionId === "ai") return <Brain className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  if (sectionId === "hotkey") return <Keyboard className={SETTINGS_NAV_ICON_CLASS_NAME} size={16} />;
  return null;
};



const SettingsSectionBlock = ({ title, description, children }: SettingsSectionBlockProps) => {
  return (
    <section className="w-full overflow-visible border-0 bg-white" aria-label={title}>
      <div className="border-b border-stone-100 px-6 pb-4 pt-5">
        <h3 className="m-0 text-base font-semibold leading-6 tracking-tight text-neutral-900">{title}</h3>
        {description ? <p className="mt-1 text-sm font-medium leading-5 text-stone-500">{description}</p> : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
};
const SettingToggle = ({ label, description, checked, onChange }: SettingToggleProps) => {
  return (
    <div className="flex min-h-14 items-center gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium leading-5 tracking-tight text-neutral-800">{label}</span>
        {description ? <span className="text-sm font-normal leading-5 text-stone-500">{description}</span> : null}
      </div>
      <button type="button" className={cn("relative h-6 w-10 min-w-10 rounded-full border-0 p-0 outline-none transition-colors duration-100 ease-out", checked ? "bg-stone-500" : "bg-stone-300")} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span className={cn("absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-100 ease-out", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
};
const SettingChoiceRow = <T extends string | number,>({ label, value, options, onChange }: SettingChoiceRowProps<T>) => {
  return (
    <div className="flex min-h-14 items-start justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
      <span className="pt-1 text-sm font-medium leading-5 tracking-tight text-neutral-900">{label}</span>
      <div className="flex max-w-sm shrink-0 flex-wrap justify-end gap-2">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button key={String(option.value)} type="button" className={cn("inline-flex flex-none items-center justify-center rounded-full border-0 px-3 py-2 text-center text-sm font-semibold leading-4 outline-none transition-colors duration-100 ease-out", isSelected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500")} onClick={() => onChange(option.value)}>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
const SettingDropdownChoiceRow = <T extends string | number,>({ label, value, options, onChange }: SettingChoiceRowProps<T>) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-14 items-start justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
      <span className="pt-1 text-sm font-medium leading-5 tracking-tight text-neutral-900">{label}</span>
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn("inline-flex min-w-36 items-center justify-between gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold leading-4 text-neutral-800 outline-none transition-colors duration-100 ease-out hover:bg-stone-50 focus-visible:bg-stone-50")}>
            <span className="truncate">{options.find((option) => option.value === value)?.label ?? String(value)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-stone-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="settings-language-dropdown-content min-w-40" onCloseAutoFocus={(event) => event.preventDefault()}>
          <DropdownMenuRadioGroup value={String(value)} onValueChange={(nextValue) => onChange(nextValue as T)}>
            {options.map((option) => <DropdownMenuRadioItem key={String(option.value)} value={String(option.value)} onSelect={() => setOpen(false)}>{option.label}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
const SettingTextInputRow = ({ label, description, value, placeholder, onChange }: SettingTextInputRowProps) => {
  return (
    <div className="flex min-h-14 items-start justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium leading-5 tracking-tight text-neutral-800">{label}</span>
        {description ? <span className="text-sm font-normal leading-5 text-stone-500">{description}</span> : null}
      </div>
      <input className="h-9 w-64 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium leading-5 tracking-tight text-neutral-800 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:bg-white" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
};
const SettingKeyValue = ({ label, value }: SettingKeyValueProps) => {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
      <span className="text-sm font-medium tracking-tight text-stone-500">{label}</span>
      <strong className="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium tracking-tight text-neutral-800">{value}</strong>
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
  const storedGoogleAccounts = useMemo(() => readStoredAccounts(), []);
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
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-white text-neutral-800" aria-label={copy.ariaLabel}>
      <aside className="flex h-full w-60 min-w-56 shrink-0 flex-col gap-4 overflow-y-auto bg-stone-100 pl-3 pt-5 max-md:h-auto max-md:max-h-48 max-md:w-full max-md:min-w-0 max-md:px-3 max-md:py-3" aria-label={copy.navAriaLabel}>
        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-3 max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-hidden">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId;
            return (
              <button key={section.id} type="button" className={cn("flex h-7 w-full shrink-0 items-center rounded-lg border-0 bg-transparent px-2 py-1 text-left text-sm leading-5 text-neutral-800 outline-none transition-colors duration-100 ease-out hover:bg-stone-200 focus-visible:bg-stone-200 max-md:w-auto max-md:min-w-32", isActive ? "bg-stone-200 text-neutral-900" : "")} onClick={() => setActiveSectionId(section.id)} aria-current={isActive ? "page" : undefined}>
                <span className="mr-3 inline-flex h-4 w-4 min-w-4 items-center justify-center text-neutral-600">{getSectionIcon(section.id)}</span>
                <span className="block min-w-0 flex-1"><span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-5 tracking-tight text-inherit">{section.label}</span></span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white max-md:h-full">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-5 pt-10">
          <div className="mx-auto w-full max-w-xl">
            {activeSectionId === "account" ? (
              <SettingsSectionBlock title={copy.accountProfileTitle} description={copy.accountProfileDescription}>
                <div className="flex min-h-20 items-center gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
                  <div className="relative flex h-9 min-w-9 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-base font-semibold tracking-tight text-stone-700" aria-hidden="true">{accountProfile.photoUrl ? <img className="absolute inset-0 h-full w-full object-cover" src={accountProfile.photoUrl} alt="" /> : <span className="absolute inset-0 flex items-center justify-center">{accountInitial}</span>}</div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-5 tracking-tight text-neutral-800">{accountName}</strong><span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-normal leading-5 text-stone-500">{accountProfile.email ?? copy.emailUnset}</span></div>
                  <button type="button" className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium tracking-tight text-neutral-800 outline-none hover:bg-stone-100 focus-visible:bg-stone-100 disabled:opacity-50" onClick={handleLogout} disabled={loading || !currentUser}>{copy.logout}</button>
                </div>
                <SettingKeyValue label={copy.statusLabel} value={currentUser ? copy.signedIn : copy.guest} />
                <SettingKeyValue label={copy.providerLabel} value={accountProfile.providerId ?? "-"} />
              </SettingsSectionBlock>
            ) : null}
            {activeSectionId === "preferences" ? (
              <SettingsSectionBlock title={copy.preferencesTitle} description={copy.preferencesDescription}>
                <SettingDropdownChoiceRow label={copy.languageLabel} value={language} options={languageOptions} onChange={handleLanguageChange} />
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
                <div className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
                  <span className="text-sm font-medium tracking-tight text-stone-500">{copy.localAiConnectionLabel}</span>
                  <div className="inline-flex min-w-0 items-center justify-end gap-3">
                    <strong className="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium tracking-tight text-neutral-800">{getLocalAiConnectionStatusLabel(localAiConnectionStatus, copy)}</strong>
                    <button type="button" className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium tracking-tight text-neutral-800 outline-none hover:bg-stone-100 focus-visible:bg-stone-100 disabled:opacity-50" onClick={handleLocalAiConnectionTest} disabled={localAiConnectionStatus === "testing"}>{copy.localAiTestButton}</button>
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
        </div>
      </main>
    </div>
  );
};



export { SettingsWorkspaceScreen };
