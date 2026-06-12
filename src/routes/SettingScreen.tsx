import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import type { StoredGoogleAccount } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import { readStoredAccounts } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import type { UserSettings } from "@/types";
import { ChevronRight, Globe, Keyboard, Shield, Trophy, Type, Volume2 } from "@/ui/icons";



type SettingsSectionId = "account" | "general" | "study" | "editor" | "audio" | "hotkey";
type SettingsLanguage = UserSettings["language"];
type AuthSessionUser = ReturnType<typeof useAuthSession>["currentUser"];
type BooleanSettingsKey = "notificationsEnabled" | "soundEnabled" | "showReviewHard" | "showReviewEasy" | "autoCarryOver" | "delayBonusEnabled" | "reviewStartNextDay" | "defaultPreviewEnabled" | "autoDraftEnabled" | "autoSaveEnabled" | "autoVoiceQuestion" | "autoVoiceAnswer";
type SettingsSectionDefinition = {
  id: SettingsSectionId;
  label: string;
  description: string;
  Icon: (props: { className?: string; size?: number; }) => ReactNode;
};
type SettingRouteCopy = {
  title: string;
  emailUnset: string;
  emptyAccountLabel: string;
  premiumTitle: string;
  premiumDescription: string;
  premiumAction: string;
  accountTitle: string;
  providerLabel: string;
  statusLabel: string;
  signedIn: string;
  guest: string;
  logout: string;
  generalTitle: string;
  languageLabel: string;
  weekStartLabel: string;
  notificationsLabel: string;
  studyTitle: string;
  showHardLabel: string;
  showEasyLabel: string;
  autoCarryOverLabel: string;
  delayBonusLabel: string;
  reviewStartNextDayLabel: string;
  editorTitle: string;
  questionDisplayLabel: string;
  questionDisplayTapToReveal: string;
  questionDisplayAlways: string;
  markdownTabSizeLabel: string;
  previewDefaultLabel: string;
  autoDraftLabel: string;
  autoSaveLabel: string;
  audioTitle: string;
  soundEffectsLabel: string;
  questionVoiceLabel: string;
  answerVoiceLabel: string;
  hotkeyTitle: string;
  languageOptions: Record<SettingsLanguage, string>;
  weekStartOptions: Record<UserSettings["weekStartDay"], string>;
  sections: readonly SettingsSectionDefinition[];
};
type SettingsRouteRowProps = {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};
type SettingsDetailCardProps = {
  title: string;
  children: ReactNode;
};
type SettingSwitchRowProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};
type SettingChoiceOption<T extends string | number> = {
  label: string;
  value: T;
};
type SettingChoiceRowProps<T extends string | number> = {
  label: string;
  options: readonly SettingChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
};
type SettingValueRowProps = {
  label: string;
  value: ReactNode;
};
type AccountProfile = {
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  providerId: string | null;
};



const SETTINGS_CARD_CLASS_NAME = "rounded-[18px] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)] ring-1 ring-black/[0.03]";
const SETTINGS_ROW_CLASS_NAME = "flex min-h-[57px] w-full items-center gap-4 px-4 text-left transition active:scale-[0.995]";
const SETTINGS_ICON_CLASS_NAME = "flex h-8 w-8 shrink-0 items-center justify-center text-[#8b8b91]";
const SETTINGS_DETAIL_ROW_CLASS_NAME = "flex min-h-[54px] items-center justify-between gap-4 border-b border-[#ececf0] px-4 py-3 last:border-b-0";
const GOOGLE_PROVIDER_ID = "google.com";
const SETTINGS_COPY: Record<SettingsLanguage, SettingRouteCopy> = {
  ja: {
    title: "設定",
    emailUnset: "メールアドレス未設定",
    emptyAccountLabel: "未ログイン",
    premiumTitle: "プレミアムへのアップグレード",
    premiumDescription: "カレンダー表示とその他の機能を含む拡張の特典。",
    premiumAction: "今すぐアップグレード",
    accountTitle: "アカウント",
    providerLabel: "プロバイダー",
    statusLabel: "状態",
    signedIn: "ログイン中",
    guest: "ゲスト",
    logout: "ログアウト",
    generalTitle: "一般",
    languageLabel: "言語",
    weekStartLabel: "週の開始曜日",
    notificationsLabel: "通知",
    studyTitle: "学習",
    showHardLabel: "Hard を表示",
    showEasyLabel: "Easy を表示",
    autoCarryOverLabel: "未完了を持ち越す",
    delayBonusLabel: "遅延ボーナス",
    reviewStartNextDayLabel: "翌日から復習開始",
    editorTitle: "エディター",
    questionDisplayLabel: "問題文の表示",
    questionDisplayTapToReveal: "タップで表示",
    questionDisplayAlways: "常に表示",
    markdownTabSizeLabel: "Markdown タブ幅",
    previewDefaultLabel: "プレビューを初期表示",
    autoDraftLabel: "下書きの自動保持",
    autoSaveLabel: "自動保存",
    audioTitle: "音と通知",
    soundEffectsLabel: "効果音",
    questionVoiceLabel: "問題文の音声",
    answerVoiceLabel: "解答文の音声",
    hotkeyTitle: "Hotkey",
    languageOptions: { ja: "日本語", en: "English", zh: "中文" },
    weekStartOptions: { monday: "月曜日", sunday: "日曜日" },
    sections: [
      { id: "general", label: "一般", description: "表示と基本動作", Icon: Globe },
      { id: "study", label: "学習", description: "復習の挙動", Icon: Shield },
      { id: "editor", label: "エディター", description: "カード編集", Icon: Type },
      { id: "audio", label: "音と通知", description: "音声と効果音", Icon: Volume2 },
      { id: "hotkey", label: "Hotkey", description: "キーボード操作", Icon: Keyboard },
    ],
  },
  en: {
    title: "Settings",
    emailUnset: "No email address",
    emptyAccountLabel: "Not signed in",
    premiumTitle: "Upgrade to Premium",
    premiumDescription: "Extended benefits including calendar display and other features.",
    premiumAction: "Upgrade now",
    accountTitle: "Account",
    providerLabel: "Provider",
    statusLabel: "Status",
    signedIn: "Signed in",
    guest: "Guest",
    logout: "Log out",
    generalTitle: "General",
    languageLabel: "Language",
    weekStartLabel: "Week starts on",
    notificationsLabel: "Notifications",
    studyTitle: "Study",
    showHardLabel: "Show Hard",
    showEasyLabel: "Show Easy",
    autoCarryOverLabel: "Carry over unfinished reviews",
    delayBonusLabel: "Delay bonus",
    reviewStartNextDayLabel: "Start reviews next day",
    editorTitle: "Editor",
    questionDisplayLabel: "Question display",
    questionDisplayTapToReveal: "Tap to reveal",
    questionDisplayAlways: "Always visible",
    markdownTabSizeLabel: "Markdown tab size",
    previewDefaultLabel: "Preview by default",
    autoDraftLabel: "Auto draft",
    autoSaveLabel: "Auto save",
    audioTitle: "Sound and notifications",
    soundEffectsLabel: "Sound effects",
    questionVoiceLabel: "Question voice",
    answerVoiceLabel: "Answer voice",
    hotkeyTitle: "Hotkey",
    languageOptions: { ja: "日本語", en: "English", zh: "中文" },
    weekStartOptions: { monday: "Monday", sunday: "Sunday" },
    sections: [
      { id: "general", label: "General", description: "Display and behavior", Icon: Globe },
      { id: "study", label: "Study", description: "Review behavior", Icon: Shield },
      { id: "editor", label: "Editor", description: "Card editing", Icon: Type },
      { id: "audio", label: "Sound and notifications", description: "Voice and effects", Icon: Volume2 },
      { id: "hotkey", label: "Hotkey", description: "Keyboard controls", Icon: Keyboard },
    ],
  },
  zh: {
    title: "设置",
    emailUnset: "未设置邮箱地址",
    emptyAccountLabel: "未登录",
    premiumTitle: "升级到高级版",
    premiumDescription: "包含日历显示和其他功能的扩展权益。",
    premiumAction: "立即升级",
    accountTitle: "账号",
    providerLabel: "提供商",
    statusLabel: "状态",
    signedIn: "已登录",
    guest: "访客",
    logout: "退出登录",
    generalTitle: "一般",
    languageLabel: "语言",
    weekStartLabel: "一周开始于",
    notificationsLabel: "通知",
    studyTitle: "学习",
    showHardLabel: "显示 Hard",
    showEasyLabel: "显示 Easy",
    autoCarryOverLabel: "结转未完成复习",
    delayBonusLabel: "延迟奖励",
    reviewStartNextDayLabel: "次日开始复习",
    editorTitle: "编辑器",
    questionDisplayLabel: "问题显示",
    questionDisplayTapToReveal: "点击显示",
    questionDisplayAlways: "始终显示",
    markdownTabSizeLabel: "Markdown 缩进宽度",
    previewDefaultLabel: "默认预览",
    autoDraftLabel: "自动草稿",
    autoSaveLabel: "自动保存",
    audioTitle: "声音和通知",
    soundEffectsLabel: "音效",
    questionVoiceLabel: "问题语音",
    answerVoiceLabel: "答案语音",
    hotkeyTitle: "Hotkey",
    languageOptions: { ja: "日本語", en: "English", zh: "中文" },
    weekStartOptions: { monday: "星期一", sunday: "星期日" },
    sections: [
      { id: "general", label: "一般", description: "显示和基本行为", Icon: Globe },
      { id: "study", label: "学习", description: "复习行为", Icon: Shield },
      { id: "editor", label: "编辑器", description: "卡片编辑", Icon: Type },
      { id: "audio", label: "声音和通知", description: "语音和音效", Icon: Volume2 },
      { id: "hotkey", label: "Hotkey", description: "键盘操作", Icon: Keyboard },
    ],
  },
};
const LANGUAGE_OPTIONS: readonly SettingChoiceOption<SettingsLanguage>[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];
const WEEK_START_OPTIONS: readonly SettingChoiceOption<UserSettings["weekStartDay"]>[] = [
  { value: "monday", label: "月" },
  { value: "sunday", label: "日" },
];
const QUESTION_DISPLAY_OPTIONS: readonly SettingChoiceOption<NonNullable<UserSettings["questionDisplayMode"]>>[] = [
  { value: "tap_to_reveal", label: "Tap" },
  { value: "always", label: "Always" },
];
const MARKDOWN_TAB_OPTIONS: readonly SettingChoiceOption<NonNullable<UserSettings["markdownTabSize"]>>[] = [
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 8, label: "8" },
];



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
    photoUrl: storedAccount?.photoUrl ?? providerProfile?.photoURL ?? null,
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



const SettingsRouteRow = ({ active, description, icon, label, onClick }: SettingsRouteRowProps) => (
  <button type="button" className={`${SETTINGS_ROW_CLASS_NAME}${active ? " bg-[#fafafa]" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>
    <span className={SETTINGS_ICON_CLASS_NAME} aria-hidden="true">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[17px] font-medium tracking-[-0.02em] text-[#1c1c1e]">{label}</span>
      <span className="mt-0.5 block truncate text-[11px] font-medium text-[#a6a6ad]">{description}</span>
    </span>
    <ChevronRight className="shrink-0 text-[#a7a7ad]" size={19} />
  </button>
);
const SettingsDetailCard = ({ title, children }: SettingsDetailCardProps) => (
  <section className={`${SETTINGS_CARD_CLASS_NAME} overflow-hidden`} aria-label={title}>
    <h2 className="border-b border-[#ececf0] px-4 py-3 text-[13px] font-semibold tracking-[-0.01em] text-[#8c8c92]">{title}</h2>
    {children}
  </section>
);
const SettingSwitchRow = ({ checked, label, onChange }: SettingSwitchRowProps) => (
  <div className={SETTINGS_DETAIL_ROW_CLASS_NAME}>
    <span className="min-w-0 truncate text-[15px] font-medium tracking-[-0.02em] text-[#1c1c1e]">{label}</span>
    <button type="button" className={`relative h-7 w-[48px] rounded-full transition ${checked ? "bg-[#34c759]" : "bg-[#d9d9df]"}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition ${checked ? "left-[23px]" : "left-[3px]"}`} />
    </button>
  </div>
);
const SettingChoiceRow = <T extends string | number,>({ label, options, value, onChange }: SettingChoiceRowProps<T>) => (
  <div className={`${SETTINGS_DETAIL_ROW_CLASS_NAME} items-start`}>
    <span className="pt-1 text-[15px] font-medium tracking-[-0.02em] text-[#1c1c1e]">{label}</span>
    <div className="flex max-w-[58%] flex-wrap justify-end gap-1.5">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button key={String(option.value)} type="button" className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${isSelected ? "bg-[#1c1c1e] text-white" : "bg-[#f0f0f4] text-[#6e6e73]"}`} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);
const SettingValueRow = ({ label, value }: SettingValueRowProps) => (
  <div className={SETTINGS_DETAIL_ROW_CLASS_NAME}>
    <span className="text-[15px] font-medium tracking-[-0.02em] text-[#1c1c1e]">{label}</span>
    <span className="min-w-0 max-w-[58%] truncate text-right text-[13px] font-semibold text-[#8c8c92]">{value}</span>
  </div>
);
const SettingScreen = () => {
  const { currentUser, loading, logout } = useAuthSession();
  const { settings, updateSettings } = useUserSettings();
  const language = settings?.language ?? "ja";
  const copy = SETTINGS_COPY[language];
  const storedGoogleAccounts = useMemo(() => readStoredAccounts(), [currentUser?.uid]);
  const accountProfile = useMemo(() => getAccountProfile(currentUser, storedGoogleAccounts), [currentUser, storedGoogleAccounts]);
  const accountName = getAccountDisplayName(accountProfile.displayName, accountProfile.email, copy.emptyAccountLabel);
  const accountInitial = getAccountInitial(accountName);
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("general");
  const weekStartDay = settings?.weekStartDay ?? "monday";
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";
  const markdownTabSize = settings?.markdownTabSize ?? 2;
  const languageOptions = useMemo(() => LANGUAGE_OPTIONS.map((option) => ({ ...option, label: copy.languageOptions[option.value] })), [copy]);
  const weekStartOptions = useMemo(() => WEEK_START_OPTIONS.map((option) => ({ ...option, label: copy.weekStartOptions[option.value] })), [copy]);
  const questionDisplayOptions = useMemo(() => QUESTION_DISPLAY_OPTIONS.map((option) => ({ ...option, label: option.value === "tap_to_reveal" ? copy.questionDisplayTapToReveal : copy.questionDisplayAlways })), [copy]);

  const updateBooleanSetting = (key: BooleanSettingsKey, checked: boolean) => {
    void updateSettings({ [key]: checked } as Partial<UserSettings>);
  };

  const handleLanguageChange = (nextLanguage: SettingsLanguage) => {
    void updateSettings({ language: nextLanguage });
  };

  const handleLogout = () => {
    void logout();
  };

  return (
    <main className="h-full min-h-0 w-full overflow-y-auto text-[#1c1c1e]" style={{ paddingTop: "max(18px, env(safe-area-inset-top))", paddingBottom: "max(96px, calc(env(safe-area-inset-bottom) + 76px))", background: "var(--backpane-bg)" }} aria-label={copy.title}>
      <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col gap-5 px-5 pb-7 pt-3">
        <h1 className="pb-2 pt-2 text-center text-[18px] font-bold tracking-[-0.03em] text-[#111]">{copy.title}</h1>
        <button type="button" className={`${SETTINGS_CARD_CLASS_NAME} flex min-h-[108px] items-center gap-4 p-4 text-left`} onClick={() => setActiveSectionId("account")}>
          <span className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f3] text-[28px] font-semibold text-[#c2c2c8]">
            {accountProfile.photoUrl ? <img src={accountProfile.photoUrl} alt="" className="h-full w-full object-cover" /> : <span>{accountInitial}</span>}
            <span className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#a3a3aa] shadow-[0_2px_8px_rgba(0,0,0,0.10)]"><Trophy size={15} /></span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[18px] font-semibold tracking-[-0.03em] text-[#1c1c1e]">{accountProfile.email ?? accountName}</span>
          </span>
          <ChevronRight className="shrink-0 text-[#a7a7ad]" size={22} />
        </button>
        <section className={`${SETTINGS_CARD_CLASS_NAME} flex min-h-[78px] items-center gap-4 px-4 py-3`} aria-label={copy.premiumTitle}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4c400] text-white shadow-[0_4px_12px_rgba(244,196,0,0.32)]"><Trophy size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-bold tracking-[-0.03em] text-[#111]">{copy.premiumTitle}</span>
            <span className="mt-1 block truncate text-[11px] font-medium text-[#a4a4aa]">{copy.premiumDescription}</span>
          </span>
          <span className="shrink-0 rounded-full border border-[#e6c600] px-3 py-2 text-[12px] font-semibold text-[#d9b800]">{copy.premiumAction}</span>
        </section>
        <section className={`${SETTINGS_CARD_CLASS_NAME} overflow-hidden`} aria-label={copy.title}>
          {copy.sections.map((section, index) => (
            <div key={section.id} className={index === 0 ? "" : "border-t border-[#ececf0]"}>
              <SettingsRouteRow active={activeSectionId === section.id} description={section.description} icon={<section.Icon size={24} />} label={section.label} onClick={() => setActiveSectionId(section.id)} />
            </div>
          ))}
        </section>
        <SettingsDetailCard title={activeSectionId === "account" ? copy.accountTitle : copy.sections.find((section) => section.id === activeSectionId)?.label ?? copy.generalTitle}>
          {activeSectionId === "account" ? (
            <>
              <SettingValueRow label={copy.statusLabel} value={currentUser ? copy.signedIn : copy.guest} />
              <SettingValueRow label={copy.providerLabel} value={accountProfile.providerId ?? "-"} />
              <SettingValueRow label={copy.emailUnset} value={accountProfile.email ?? "-"} />
              <div className={SETTINGS_DETAIL_ROW_CLASS_NAME}>
                <span className="text-[15px] font-medium tracking-[-0.02em] text-[#1c1c1e]">{copy.logout}</span>
                <button type="button" className="rounded-full bg-[#f0f0f4] px-4 py-2 text-[13px] font-semibold text-[#6e6e73] disabled:opacity-50" disabled={loading || !currentUser} onClick={handleLogout}>{copy.logout}</button>
              </div>
            </>
          ) : null}
          {activeSectionId === "general" ? (
            <>
              <SettingChoiceRow label={copy.languageLabel} value={language} options={languageOptions} onChange={handleLanguageChange} />
              <SettingChoiceRow label={copy.weekStartLabel} value={weekStartDay} options={weekStartOptions} onChange={(value) => void updateSettings({ weekStartDay: value })} />
              <SettingSwitchRow label={copy.notificationsLabel} checked={settings?.notificationsEnabled ?? false} onChange={(checked) => updateBooleanSetting("notificationsEnabled", checked)} />
            </>
          ) : null}
          {activeSectionId === "study" ? (
            <>
              <SettingSwitchRow label={copy.showHardLabel} checked={settings?.showReviewHard ?? true} onChange={(checked) => updateBooleanSetting("showReviewHard", checked)} />
              <SettingSwitchRow label={copy.showEasyLabel} checked={settings?.showReviewEasy ?? true} onChange={(checked) => updateBooleanSetting("showReviewEasy", checked)} />
              <SettingSwitchRow label={copy.autoCarryOverLabel} checked={settings?.autoCarryOver ?? true} onChange={(checked) => updateBooleanSetting("autoCarryOver", checked)} />
              <SettingSwitchRow label={copy.delayBonusLabel} checked={settings?.delayBonusEnabled ?? false} onChange={(checked) => updateBooleanSetting("delayBonusEnabled", checked)} />
              <SettingSwitchRow label={copy.reviewStartNextDayLabel} checked={settings?.reviewStartNextDay ?? true} onChange={(checked) => updateBooleanSetting("reviewStartNextDay", checked)} />
            </>
          ) : null}
          {activeSectionId === "editor" ? (
            <>
              <SettingChoiceRow label={copy.questionDisplayLabel} value={questionDisplayMode} options={questionDisplayOptions} onChange={(value) => void updateSettings({ questionDisplayMode: value })} />
              <SettingChoiceRow label={copy.markdownTabSizeLabel} value={markdownTabSize} options={MARKDOWN_TAB_OPTIONS} onChange={(value) => void updateSettings({ markdownTabSize: value })} />
              <SettingSwitchRow label={copy.previewDefaultLabel} checked={settings?.defaultPreviewEnabled ?? false} onChange={(checked) => updateBooleanSetting("defaultPreviewEnabled", checked)} />
              <SettingSwitchRow label={copy.autoDraftLabel} checked={settings?.autoDraftEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoDraftEnabled", checked)} />
              <SettingSwitchRow label={copy.autoSaveLabel} checked={settings?.autoSaveEnabled ?? true} onChange={(checked) => updateBooleanSetting("autoSaveEnabled", checked)} />
            </>
          ) : null}
          {activeSectionId === "audio" ? (
            <>
              <SettingSwitchRow label={copy.soundEffectsLabel} checked={settings?.soundEnabled ?? true} onChange={(checked) => updateBooleanSetting("soundEnabled", checked)} />
              <SettingSwitchRow label={copy.questionVoiceLabel} checked={settings?.autoVoiceQuestion ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceQuestion", checked)} />
              <SettingSwitchRow label={copy.answerVoiceLabel} checked={settings?.autoVoiceAnswer ?? false} onChange={(checked) => updateBooleanSetting("autoVoiceAnswer", checked)} />
            </>
          ) : null}
          {activeSectionId === "hotkey" ? (
            <>
              <SettingValueRow label="Search" value="⌘K / Ctrl K" />
              <SettingValueRow label="Sidebar" value="⌘B / Ctrl B" />
              <SettingValueRow label="Flip card" value="Space / Enter" />
            </>
          ) : null}
        </SettingsDetailCard>
      </div>
    </main>
  );
};



export default SettingScreen;
