import { useMemo, useState } from "react";
import type { LocalAiSettings } from "@platform/ai/localAiSettings";
import { getLocalAiSettings, setLocalAiSettings } from "@platform/ai/localAiSettings";
import { testOllamaConnection } from "@platform/ai/ollamaClient";
import { Brain, ChevronDown, Globe, Keyboard, Shield, Type, User, Volume2 } from "@web-renderer/chip/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@web-renderer/chip/panel/dropdown-menu";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { SettingsThemeColorControl } from "./SettingsThemeColorControl";
import type { StoredGoogleAccount } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import { readStoredAccounts } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import type { UserSettings } from "@/types";



type SettingsSectionId = "account" | "preferences" | "study" | "editor" | "audio" | "ai" | "hotkey";
type SettingsLanguage = UserSettings["language"];
type BooleanSettingsKey = "notificationsEnabled" | "soundEnabled" | "showReviewHard" | "showReviewEasy" | "autoCarryOver" | "delayBonusEnabled" | "reviewStartNextDay" | "defaultPreviewEnabled" | "autoDraftEnabled" | "autoSaveEnabled" | "autoVoiceQuestion" | "autoVoiceAnswer";
type QuestionDisplayMode = NonNullable<UserSettings["questionDisplayMode"]>;
type MarkdownTabSize = NonNullable<UserSettings["markdownTabSize"]>;
type LocalAiConnectionStatus = "idle" | "testing" | "connected" | "model-missing" | "failed";
type SettingOption<T extends string | number> = {
  value: T; label: string };
type SettingToggleProps = {
  label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string };
type SettingChoiceRowProps<T extends string | number> = {
  label: string; value: T; options: readonly SettingOption<T>[]; onChange: (value: T) => void };
type SettingKeyValueProps = {
  label: string; value: ReactNode };
type SettingTextInputRowProps = {
  label: string; value: string; onChange: (value: string) => void; description?: string; placeholder?: string };
type AccountProfile = {
  displayName: string | null; email: string | null; photoUrl: string | null; providerId: string | null };
type Copy = {
  title: Record<SettingsSectionId, string>;
  description: Record<SettingsSectionId, string>;
  language: string;
  weekStart: string;
  notifications: string;
  showHard: string;
  showEasy: string;
  autoCarryOver: string;
  delayBonus: string;
  reviewStartNextDay: string;
  questionDisplay: string;
  markdownTab: string;
  previewDefault: string;
  autoDraft: string;
  autoSave: string;
  soundEffects: string;
  questionVoice: string;
  answerVoice: string;
  localAiEnabled: string;
  localAiProvider: string;
  localAiBaseUrl: string;
  localAiModel: string;
  localAiConnection: string;
  localAiTest: string;
  logout: string;
  status: string;
  signedIn: string;
  guest: string;
  provider: string;
  emailUnset: string;
  emptyAccount: string;
  hotkeys: readonly { label: string; keys: string }[];
  localAiStatus: Record<LocalAiConnectionStatus, string>;
  languageOptions: Record<SettingsLanguage, string>;
  weekStartOptions: Record<UserSettings["weekStartDay"], string>;
  questionDisplayOptions: Record<QuestionDisplayMode, string>;
};



const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = ["account", "preferences", "study", "editor", "audio", "ai", "hotkey"];
const GOOGLE_PROVIDER_ID = "google.com";
const ICON_CLASS_NAME = "h-4 w-4";
const COPY: Record<SettingsLanguage, Copy> = {
  ja: {
    title: { account: "プロフィール", preferences: "環境設定", study: "学習", editor: "エディター", audio: "音声", ai: "ローカルAI", hotkey: "Hotkey" },
    description: { account: "現在のログインセッションです。", preferences: "画面表示と日付の基本設定です。", study: "復習カードの表示と日送りの挙動です。", editor: "カード編集画面の入力補助です。", audio: "学習時の音声再生と効果音です。", ai: "Q&Aカード作成で使う端末ごとのローカルLLM接続です。この設定は同期しません。", hotkey: "キーボード操作" },
    language: "言語",
    weekStart: "週の開始曜日",
    notifications: "通知",
    showHard: "Hard を表示",
    showEasy: "Easy を表示",
    autoCarryOver: "未完了を持ち越す",
    delayBonus: "遅延ボーナス",
    reviewStartNextDay: "翌日から復習開始",
    questionDisplay: "問題文の表示",
    markdownTab: "Markdown タブ幅",
    previewDefault: "プレビューを初期表示",
    autoDraft: "下書きの自動保持",
    autoSave: "自動保存",
    soundEffects: "効果音",
    questionVoice: "問題文の音声",
    answerVoice: "解答文の音声",
    localAiEnabled: "ローカルAI回答案",
    localAiProvider: "プロバイダー",
    localAiBaseUrl: "接続先 URL",
    localAiModel: "モデル",
    localAiConnection: "接続状態",
    localAiTest: "接続テスト",
    logout: "ログアウト",
    status: "状態",
    signedIn: "ログイン中",
    guest: "ゲスト",
    provider: "プロバイダー",
    emailUnset: "メールアドレス未設定",
    emptyAccount: "未ログイン",
    hotkeys: [{ label: "検索を開く", keys: "⌘K / Ctrl K" }, { label: "左サイドバーを切り替え", keys: "⌘B / Ctrl B" }, { label: "右サイドバーを切り替え", keys: "⌘⇧B / Ctrl Shift B" }, { label: "カードを裏返す", keys: "Space / Enter" }, { label: "前後のカードへ移動", keys: "↑ / ↓" }],
    localAiStatus: { idle: "未確認", testing: "確認中", connected: "接続済み", "model-missing": "接続済み / モデル未検出", failed: "接続できませんでした" },
    languageOptions: { ja: "日本語", en: "English", zh: "中文" },
    weekStartOptions: { monday: "月曜日", sunday: "日曜日" },
    questionDisplayOptions: { tap_to_reveal: "タップで表示", always: "常に表示" },
  },
  en: {
    title: { account: "Profile", preferences: "Preferences", study: "Study", editor: "Editor", audio: "Audio", ai: "Local AI", hotkey: "Hotkey" },
    description: { account: "Current login session.", preferences: "Basic display and date settings.", study: "Review card display and carry-over behavior.", editor: "Input assistance for card editing.", audio: "Study audio playback and sound effects.", ai: "Per-device local LLM connection for Q&A card creation. This setting does not sync.", hotkey: "Keyboard shortcuts" },
    language: "Language",
    weekStart: "Week starts on",
    notifications: "Notifications",
    showHard: "Show Hard",
    showEasy: "Show Easy",
    autoCarryOver: "Carry over unfinished reviews",
    delayBonus: "Delay bonus",
    reviewStartNextDay: "Start review next day",
    questionDisplay: "Question display",
    markdownTab: "Markdown tab width",
    previewDefault: "Show preview by default",
    autoDraft: "Auto keep drafts",
    autoSave: "Auto save",
    soundEffects: "Sound effects",
    questionVoice: "Question voice",
    answerVoice: "Answer voice",
    localAiEnabled: "Local AI answer suggestions",
    localAiProvider: "Provider",
    localAiBaseUrl: "Base URL",
    localAiModel: "Model",
    localAiConnection: "Connection",
    localAiTest: "Test connection",
    logout: "Log out",
    status: "Status",
    signedIn: "Signed in",
    guest: "Guest",
    provider: "Provider",
    emailUnset: "No email address",
    emptyAccount: "Not signed in",
    hotkeys: [{ label: "Open search", keys: "⌘K / Ctrl K" }, { label: "Toggle left sidebar", keys: "⌘B / Ctrl B" }, { label: "Toggle right sidebar", keys: "⌘⇧B / Ctrl Shift B" }, { label: "Flip card", keys: "Space / Enter" }, { label: "Move between cards", keys: "↑ / ↓" }],
    localAiStatus: { idle: "Not checked", testing: "Checking", connected: "Connected", "model-missing": "Connected / model not found", failed: "Could not connect" },
    languageOptions: { ja: "日本語", en: "English", zh: "中文" },
    weekStartOptions: { monday: "Monday", sunday: "Sunday" },
    questionDisplayOptions: { tap_to_reveal: "Tap to reveal", always: "Always visible" },
  },
  zh: {
    title: { account: "个人资料", preferences: "偏好设置", study: "学习", editor: "编辑器", audio: "音频", ai: "本地 AI", hotkey: "快捷键" },
    description: { account: "当前登录会话。", preferences: "显示和日期的基础设置。", study: "复习卡片显示和顺延行为。", editor: "卡片编辑界面的输入辅助。", audio: "学习时的音频播放和音效。", ai: "Q&A 卡片创建使用的每设备本地 LLM 连接。此设置不会同步。", hotkey: "键盘快捷键" },
    language: "语言",
    weekStart: "每周开始日",
    notifications: "通知",
    showHard: "显示 Hard",
    showEasy: "显示 Easy",
    autoCarryOver: "顺延未完成内容",
    delayBonus: "延迟奖励",
    reviewStartNextDay: "次日开始复习",
    questionDisplay: "问题显示",
    markdownTab: "Markdown 制表宽度",
    previewDefault: "默认显示预览",
    autoDraft: "自动保留草稿",
    autoSave: "自动保存",
    soundEffects: "音效",
    questionVoice: "问题语音",
    answerVoice: "答案语音",
    localAiEnabled: "本地 AI 答案建议",
    localAiProvider: "提供方",
    localAiBaseUrl: "连接 URL",
    localAiModel: "模型",
    localAiConnection: "连接状态",
    localAiTest: "连接测试",
    logout: "退出登录",
    status: "状态",
    signedIn: "已登录",
    guest: "访客",
    provider: "提供方",
    emailUnset: "未设置邮箱地址",
    emptyAccount: "未登录",
    hotkeys: [{ label: "打开搜索", keys: "⌘K / Ctrl K" }, { label: "切换左侧栏", keys: "⌘B / Ctrl B" }, { label: "切换右侧栏", keys: "⌘⇧B / Ctrl Shift B" }, { label: "翻转卡片", keys: "Space / Enter" }, { label: "移动卡片", keys: "↑ / ↓" }],
    localAiStatus: { idle: "未确认", testing: "确认中", connected: "已连接", "model-missing": "已连接 / 未检测到模型", failed: "无法连接" },
    languageOptions: { ja: "日本語", en: "English", zh: "中文" },
    weekStartOptions: { monday: "星期一", sunday: "星期日" },
    questionDisplayOptions: { tap_to_reveal: "点击显示", always: "始终显示" },
  },
};



const toOptions = <T extends string | number,>(values: readonly T[], labels: Record<T, string>): SettingOption<T>[] => values.map((value) => ({ value, label: labels[value] }));
const normalizeAccountEmail = (email: string | null | undefined): string | null => {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? normalizedEmail : null;
};
const getStoredSignedInGoogleAccount = (currentUser: ReturnType<typeof useAuthSession>["currentUser"], storedAccounts: readonly StoredGoogleAccount[]): StoredGoogleAccount | null => {
  const userEmail = normalizeAccountEmail(currentUser?.email);
  if (!userEmail) return storedAccounts[0] ?? null;
  return storedAccounts.find((account) => normalizeAccountEmail(account.email) === userEmail) ?? null;
};
const getAccountProfile = (currentUser: ReturnType<typeof useAuthSession>["currentUser"], storedAccounts: readonly StoredGoogleAccount[]): AccountProfile => {
  const providerProfile = currentUser?.providerData.find((profile) => profile.providerId === GOOGLE_PROVIDER_ID) ?? currentUser?.providerData.at(0) ?? null;
  const storedAccount = getStoredSignedInGoogleAccount(currentUser, storedAccounts);
  return { displayName: storedAccount?.name ?? providerProfile?.displayName ?? currentUser?.displayName ?? null, email: storedAccount?.email ?? currentUser?.email ?? providerProfile?.email ?? null, photoUrl: storedAccount?.photoUrl ?? null, providerId: providerProfile?.providerId ?? null };
};
const getAccountDisplayName = (profile: AccountProfile, fallbackLabel: string): string => {
  const displayName = profile.displayName?.trim();
  if (displayName) return displayName;
  const emailLocalPart = profile.email?.split("@")[0]?.trim();
  return emailLocalPart || fallbackLabel;
};
const getSectionIcon = (sectionId: SettingsSectionId): ReactNode => {
  if (sectionId === "account") return <User className={ICON_CLASS_NAME} size={16} />;
  if (sectionId === "preferences") return <Globe className={ICON_CLASS_NAME} size={16} />;
  if (sectionId === "study") return <Shield className={ICON_CLASS_NAME} size={16} />;
  if (sectionId === "editor") return <Type className={ICON_CLASS_NAME} size={16} />;
  if (sectionId === "audio") return <Volume2 className={ICON_CLASS_NAME} size={16} />;
  if (sectionId === "ai") return <Brain className={ICON_CLASS_NAME} size={16} />;
  return <Keyboard className={ICON_CLASS_NAME} size={16} />;
};



const Section = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <section className="w-full overflow-visible border-0 bg-white" aria-label={title}>
    <div className="border-b border-stone-100 px-6 pb-4 pt-5"><h3 className="m-0 text-base font-semibold leading-6 tracking-tight text-neutral-900">{title}</h3><p className="mt-1 text-sm font-medium leading-5 text-stone-500">{description}</p></div>
    <div className="flex flex-col">{children}</div>
  </section>
);
const SettingToggle = ({ label, description, checked, onChange }: SettingToggleProps) => (
  <div className="flex min-h-14 items-center gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
    <div className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-sm font-medium leading-5 tracking-tight text-neutral-800">{label}</span>{description ? <span className="text-sm font-normal leading-5 text-stone-500">{description}</span> : null}</div>
    <button type="button" className={cn("relative h-6 w-10 min-w-10 rounded-full border-0 p-0 outline-none transition-colors duration-100 ease-out", checked ? "bg-[var(--primary-color)]" : "bg-stone-300")} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span className={cn("absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-100 ease-out", checked ? "translate-x-4" : "translate-x-0")} /></button>
  </div>
);
const SettingChoiceRow = <T extends string | number,>({ label, value, options, onChange }: SettingChoiceRowProps<T>) => (
  <div className="flex min-h-14 items-start justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
    <span className="pt-1 text-sm font-medium leading-5 tracking-tight text-neutral-900">{label}</span>
    <div className="flex max-w-sm shrink-0 flex-wrap justify-end gap-2">{options.map((option) => <button key={String(option.value)} type="button" className={cn("inline-flex flex-none items-center justify-center rounded-full border-0 px-3 py-2 text-center text-sm font-semibold leading-4 outline-none transition-colors duration-100 ease-out", option.value === value ? "bg-[var(--primary-color)] text-white" : "bg-neutral-100 text-neutral-500")} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>
  </div>
);
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
const SettingTextInputRow = ({ label, description, value, placeholder, onChange }: SettingTextInputRowProps) => (
  <div className="flex min-h-14 items-start justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0">
    <div className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-sm font-medium leading-5 tracking-tight text-neutral-800">{label}</span>{description ? <span className="text-sm font-normal leading-5 text-stone-500">{description}</span> : null}</div>
    <input className="h-9 w-64 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium leading-5 tracking-tight text-neutral-800 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:bg-white" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>
);
const SettingKeyValue = ({ label, value }: SettingKeyValueProps) => <div className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0"><span className="text-sm font-medium tracking-tight text-stone-500">{label}</span><strong className="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium tracking-tight text-neutral-800">{value}</strong></div>;
const SettingsWorkspaceRootScreen = () => {
  const { currentUser, loading, logout } = useAuthSession();
  const { settings, updateSettings } = useUserSettings();
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("account");
  const [localAiSettings, setLocalAiSettingsState] = useState<LocalAiSettings>(() => getLocalAiSettings());
  const [localAiConnectionStatus, setLocalAiConnectionStatus] = useState<LocalAiConnectionStatus>("idle");
  const language = settings?.language ?? "ja";
  const copy = COPY[language];
  const storedGoogleAccounts = useMemo(() => readStoredAccounts(), []);
  const accountProfile = useMemo(() => getAccountProfile(currentUser, storedGoogleAccounts), [currentUser, storedGoogleAccounts]);
  const accountName = getAccountDisplayName(accountProfile, copy.emptyAccount);
  const weekStartDay = settings?.weekStartDay ?? "monday";
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";
  const markdownTabSize = settings?.markdownTabSize ?? 2;
  const updateBooleanSetting = (key: BooleanSettingsKey, checked: boolean) => void updateSettings({ [key]: checked } as Partial<UserSettings>);
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
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-white text-neutral-800" aria-label={copy.title.preferences}>
      <aside className="flex h-full w-60 min-w-56 shrink-0 flex-col gap-4 overflow-y-auto bg-stone-100 pl-3 pt-5 max-md:h-auto max-md:max-h-48 max-md:w-full max-md:min-w-0 max-md:px-3 max-md:py-3" aria-label={copy.title.preferences}>
        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-3 max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-hidden">
          {SETTINGS_SECTION_IDS.map((sectionId) => <button key={sectionId} type="button" className={cn("flex h-7 w-full shrink-0 items-center rounded-lg border-0 bg-transparent px-2 py-1 text-left text-sm leading-5 text-neutral-800 outline-none transition-colors duration-100 ease-out hover:bg-stone-200 focus-visible:bg-stone-200 max-md:w-auto max-md:min-w-32", sectionId === activeSectionId ? "bg-stone-200 text-neutral-900" : "")} onClick={() => setActiveSectionId(sectionId)} aria-current={sectionId === activeSectionId ? "page" : undefined}><span className="mr-3 inline-flex h-4 w-4 min-w-4 items-center justify-center text-neutral-600">{getSectionIcon(sectionId)}</span><span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-5 tracking-tight text-inherit">{copy.title[sectionId]}</span></button>)}
        </nav>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white max-md:h-full">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-5 pt-10"><div className="mx-auto w-full max-w-xl">
          {activeSectionId === "account" ? <Section title={copy.title.account} description={copy.description.account}><div className="flex min-h-20 items-center gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0"><div className="relative flex h-9 min-w-9 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-base font-semibold tracking-tight text-stone-700" aria-hidden="true">{accountProfile.photoUrl ? <img className="absolute inset-0 h-full w-full object-cover" src={accountProfile.photoUrl} alt="" /> : <span>{accountName.trim().charAt(0).toUpperCase() ?? "M"}</span>}</div><div className="flex min-w-0 flex-1 flex-col gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-5 tracking-tight text-neutral-800">{accountName}</strong><span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-normal leading-5 text-stone-500">{accountProfile.email ?? copy.emailUnset}</span></div><button type="button" className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium tracking-tight text-neutral-800 outline-none hover:bg-stone-100 focus-visible:bg-stone-100 disabled:opacity-50" onClick={() => void logout()} disabled={loading || !currentUser}>{copy.logout}</button></div><SettingKeyValue label={copy.status} value={currentUser ? copy.signedIn : copy.guest} /><SettingKeyValue label={copy.provider} value={accountProfile.providerId ?? "-"} /></Section> : null}
          {activeSectionId === "preferences" ? <Section title={copy.title.preferences} description={copy.description.preferences}><SettingsThemeColorControl /><SettingDropdownChoiceRow label={copy.language} value={language} options={toOptions<SettingsLanguage>(["ja", "en", "zh"], copy.languageOptions)} onChange={(value) => void updateSettings({ language: value })} /><SettingChoiceRow label={copy.weekStart} value={weekStartDay} options={toOptions<UserSettings["weekStartDay"]>(["monday", "sunday"], copy.weekStartOptions)} onChange={(value) => void updateSettings({ weekStartDay: value })} /><SettingToggle label={copy.notifications} checked={settings?.notificationsEnabled ?? false} onChange={(checked) => updateBooleanSetting("notificationsEnabled", checked)} /></Section> : null}
          {activeSectionId === "study" ? <Section title={copy.title.study} description={copy.description.study}><SettingToggle label={copy.showHard} checked={settings?.showReviewHard ?? true} onChange={(checked) => updateBooleanSetting("showReviewHard", checked)} /><SettingToggle label={copy.showEasy} checked={settings?.showReviewEasy ?? true} onChange={(checked) => updateBooleanSetting("showReviewEasy", checked)} /><SettingToggle label={copy.autoCarryOver} checked={settings?.autoCarryOver ?? true} onChange={(checked) => updateBooleanSetting("autoCarryOver", checked)} /><SettingToggle label={copy.delayBonus} checked={settings?.delayBonusEnabled ?? false} onChange={(checked) => updateBooleanSetting("delayBonusEnabled", checked)} /><SettingToggle label={copy.reviewStartNextDay} checked={settings?.reviewStartNextDay ?? true} onChange={(checked) => updateBooleanSetting("reviewStartNextDay", checked)} /></Section> : null}
          {activeSectionId === "editor" ? <Section title={copy.title.editor} description={copy.description.editor}><SettingChoiceRow label={copy.questionDisplay} value={questionDisplayMode} options={toOptions<QuestionDisplayMode>(["tap_to_reveal", "always"], copy.questionDisplayOptions)} onChange={(value) => void updateSettings({ questionDisplayMode: value })} /><SettingChoiceRow label={copy.markdownTab} value={markdownTabSize} options={toOptions<MarkdownTabSize>([2, 4, 8], { 2: "2", 4: "4", 8: "8" })} onChange={(value) => void updateSettings({ markdownTabSize: value })} /><SettingToggle label={copy.previewDefault} checked={settings?.defaultPreviewEnabled ?? false} onChange={(checked) => updateBooleanSetting("defaultPreviewEnabled", checked)} /><SettingToggle label={copy.autoDraft} checked={settings?.autoDraftEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoDraftEnabled", checked)} /><SettingToggle label={copy.autoSave} checked={settings?.autoSaveEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoSaveEnabled", checked)} /></Section> : null}
          {activeSectionId === "audio" ? <Section title={copy.title.audio} description={copy.description.audio}><SettingToggle label={copy.soundEffects} checked={settings?.soundEnabled ?? true} onChange={(checked) => updateBooleanSetting("soundEnabled", checked)} /><SettingToggle label={copy.questionVoice} checked={settings?.autoVoiceQuestion ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceQuestion", checked)} /><SettingToggle label={copy.answerVoice} checked={settings?.autoVoiceAnswer ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceAnswer", checked)} /></Section> : null}
          {activeSectionId === "ai" ? <Section title={copy.title.ai} description={copy.description.ai}><SettingToggle label={copy.localAiEnabled} checked={localAiSettings.enabled} onChange={(checked) => handleLocalAiSettingsChange({ ...localAiSettings, enabled: checked })} /><SettingKeyValue label={copy.localAiProvider} value="Ollama" /><SettingTextInputRow label={copy.localAiBaseUrl} value={localAiSettings.baseUrl} placeholder="http://127.0.0.1:11434" onChange={(value) => handleLocalAiSettingsChange({ ...localAiSettings, baseUrl: value })} /><SettingTextInputRow label={copy.localAiModel} value={localAiSettings.model} placeholder="llama3.2:3b" onChange={(value) => handleLocalAiSettingsChange({ ...localAiSettings, model: value })} /><div className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0"><span className="text-sm font-medium tracking-tight text-stone-500">{copy.localAiConnection}</span><div className="inline-flex min-w-0 items-center justify-end gap-3"><strong className="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium tracking-tight text-neutral-800">{copy.localAiStatus[localAiConnectionStatus]}</strong><button type="button" className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium tracking-tight text-neutral-800 outline-none hover:bg-stone-100 focus-visible:bg-stone-100 disabled:opacity-50" onClick={handleLocalAiConnectionTest} disabled={localAiConnectionStatus === "testing"}>{copy.localAiTest}</button></div></div></Section> : null}
          {activeSectionId === "hotkey" ? <Section title={copy.title.hotkey} description={copy.description.hotkey}>{copy.hotkeys.map((hotkey) => <SettingKeyValue key={hotkey.keys} label={hotkey.label} value={<code>{hotkey.keys}</code>} />)}</Section> : null}
        </div></div>
      </main>
    </div>
  );
};



export { SettingsWorkspaceRootScreen };
