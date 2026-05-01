import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { BlockOrdering } from "@/components/settings/BlockOrdering";
import { DeviceSyncSettings } from "@/components/settings/DeviceSyncSettings";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  SETTINGS_ICON_SURFACE_CLASS_NAME,
  SettingsBadge,
  SettingsEmptyState,
  SettingsKeycap,
  SettingsNote,
  type SettingsTone,
} from "@/components/settings/settingsUi";
import { MarkdownWhitespaceSettings } from "@/components/settings/MarkdownWhitespaceSettings";
import { TagManagerPanel } from "@/components/tag/TagManagerPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useFolders } from "@/hooks/folder/useFolders";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { useSyncSettings } from "@/hooks/sync/useSyncSettings";
import { cn } from "@/lib/utils";
import { auth } from "@/services/firebase";
import { getLocalDb } from "@/services/localDB";
import type { SyncSettings } from "@/types";
import {
  BookOpen,
  Check,
  Cloud,
  Folder,
  Keyboard,
  Loader2,
  LogOut,
  RefreshCw,
  Tag,
  Volume2,
} from "@/ui/icons";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import {
  DEFAULT_SETTINGS_TAB,
  type SettingsTab,
  type SettingsTabParam,
} from "@constants/shared/app";

type SidebarItemIcon = typeof BookOpen;

type SidebarItem = {
  id: SettingsTab;
  label: string;
  description: string;
  icon: SidebarItemIcon;
};

type SidebarSection = {
  id: string;
  label: string;
  items: readonly SidebarItem[];
};

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SettingsTabParam;
};

type SettingsChoiceCardProps = {
  title: string;
  description: string;
  selected?: boolean;
  badge?: string;
  onSelect?: () => void;
  disabled?: boolean;
};

type ReviewToggleSettingKey = "showReviewHard" | "showReviewEasy";

const settingsSidebarSections = [
  {
    id: "preferences",
    label: "Preferences",
    items: [
      {
        id: "study",
        label: "学習設定",
        description:
          "カード編集、レビュー導線、スケジュールの既定値をまとめて管理します。",
        icon: BookOpen,
      },
      {
        id: "voice",
        label: "音声設定",
        description: "自動読み上げの挙動と、音声まわりの既定値を確認します。",
        icon: Volume2,
      },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      {
        id: "tags",
        label: "タグ管理",
        description:
          "タグ階層、カテゴリ、色、マージや削除をひとつの画面で整理できます。",
        icon: Tag,
      },
      {
        id: "shortcut",
        label: "ショートカット",
        description: "主要画面で使えるショートカットを一覧で確認できます。",
        icon: Keyboard,
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "sync",
        label: "同期設定",
        description:
          "自動同期、クラウド接続、端末管理、ストレージ使用量をまとめて確認します。",
        icon: RefreshCw,
      },
    ],
  },
] as const satisfies ReadonlyArray<SidebarSection>;

const sidebarItems: readonly SidebarItem[] = settingsSidebarSections.flatMap(
  (section) => section.items,
);

const voiceOptions = [
  {
    id: "kore",
    label: "Kore",
    description: "現行ビルドの既定音声です。",
    badge: "既定",
    selected: true,
  },
  {
    id: "puck",
    label: "Puck",
    description: "将来の選択式対応に向けて予約済みです。",
    badge: "準備中",
  },
  {
    id: "charon",
    label: "Charon",
    description: "将来の選択式対応に向けて予約済みです。",
    badge: "準備中",
  },
  {
    id: "fenrir",
    label: "Fenrir",
    description: "将来の選択式対応に向けて予約済みです。",
    badge: "準備中",
  },
  {
    id: "zephyr",
    label: "Zephyr",
    description: "将来の選択式対応に向けて予約済みです。",
    badge: "準備中",
  },
] as const;

const reviewButtonItems = [
  {
    id: "forgot",
    label: "忘れた",
    description:
      "思い出せなかったカード用の基本ボタンです。復習導線の基準なので常時表示です。",
    badge: "固定",
    dotClassName: "bg-rose-500",
  },
  {
    id: "hard",
    label: "あいまい",
    description:
      "思い出せたけれど不安が残るときに使います。復習間隔の伸びを抑えます。",
    settingKey: "showReviewHard",
    dotClassName: "bg-amber-500",
  },
  {
    id: "remembered",
    label: "覚えた",
    description: "通常の正答ボタンです。忘却曲線に沿って次回間隔を伸ばします。",
    badge: "固定",
    dotClassName: "bg-sky-500",
  },
  {
    id: "easy",
    label: "余裕",
    description:
      "十分に定着したカード向けです。通常より長い間隔で効率よく復習します。",
    settingKey: "showReviewEasy",
    dotClassName: "bg-emerald-500",
  },
] satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  badge?: string;
  settingKey?: ReviewToggleSettingKey;
  dotClassName: string;
}>;

const shortcutSections = [
  {
    title: "全般",
    shortcuts: [
      { key: "H", desc: "ホームに移動" },
      { key: "C", desc: "カレンダーに移動" },
      { key: "S", desc: "統計に移動" },
      { key: ",", desc: "設定を開く" },
      { key: "T", desc: "訓練モードに移動" },
      { key: "?", desc: "ヘルプを表示" },
      {
        key: "Ctrl + B",
        desc: "サイドバーの開閉（作業ビュー / ナビゲーション）",
      },
      {
        key: "Ctrl + P",
        desc: "Quick Open でカード / フォルダ / タグを検索",
      },
      {
        key: "Ctrl + Shift + F",
        desc: "Global Search で全文検索を開く",
      },
    ],
  },
  {
    title: "学習モード",
    shortcuts: [
      { key: "1 / O", desc: "覚えた" },
      { key: "2 / X", desc: "忘れた" },
      { key: "3 / S", desc: "スキップ" },
      { key: "Space / Enter", desc: "解答を表示" },
    ],
  },
  {
    title: "カレンダー",
    shortcuts: [
      { key: "← / →", desc: "日付を移動" },
      { key: "↑ / ↓", desc: "週を移動" },
    ],
  },
  {
    title: "カードエディタ",
    shortcuts: [
      {
        key: "Tab",
        desc: "入力項目を移動（タイトル → 問題 → 解答）",
      },
      { key: "Shift + Tab", desc: "前の入力項目へ移動" },
      {
        key: "Ctrl + V",
        desc: "画像ブロックへのホバー中に画像を貼り付け",
      },
    ],
  },
  {
    title: "作業ビュー",
    shortcuts: [
      {
        key: "Ctrl + N",
        desc: "新規カードを作成（フォルダ選択時）",
      },
      {
        key: "Ctrl + Shift + N",
        desc: "新規フォルダを作成（フォルダ選択時）",
      },
      { key: "F2", desc: "選択アイテムをリネーム" },
      {
        key: "Del / Backspace",
        desc: "選択アイテムを削除（確認あり）",
      },
      { key: "Enter", desc: "カードを開く（編集表示）" },
      { key: "↑ / ↓", desc: "前 / 次のアイテムへ移動" },
      { key: "→", desc: "フォルダを展開 / 子要素へ移動" },
      { key: "←", desc: "フォルダを折りたたみ / 親要素へ移動" },
    ],
  },
] as const;

const syncIntervalOptions = [5, 15, 30, 60] as const;

const getDefaultSidebarItem = (): SidebarItem => {
  const defaultItem =
    sidebarItems.find((item) => item.id === DEFAULT_SETTINGS_TAB) ??
    settingsSidebarSections[0]?.items[0];

  if (!defaultItem) {
    throw new Error("settingsSidebarSections must include at least one item.");
  }

  return defaultItem;
};

const defaultSidebarItem = getDefaultSidebarItem();

const isSidebarSettingsTab = (
  value?: SettingsTabParam,
): value is SettingsTab => {
  return sidebarItems.some((item) => item.id === value);
};

const resolveSettingsTab = (tab?: SettingsTabParam): SettingsTab => {
  if (tab === "theme" || tab === "display") return DEFAULT_SETTINGS_TAB;

  return isSidebarSettingsTab(tab) ? tab : DEFAULT_SETTINGS_TAB;
};

const getSidebarItem = (tab: SettingsTab): SidebarItem => {
  return sidebarItems.find((item) => item.id === tab) ?? defaultSidebarItem;
};

const getOnOffLabel = (enabled: boolean) => {
  return enabled ? "ON" : "OFF";
};

const formatLastSyncTime = (value: Date | null) => {
  if (!value) return "未同期";
  return value.toLocaleString("ja-JP");
};

const getSyncStatusMeta = (
  status: string,
): { label: string; tone: SettingsTone; description: string } => {
  switch (status) {
    case "syncing":
      return {
        label: "同期中",
        tone: "info",
        description: "ネットワークとローカル変更を照合しています。",
      };
    case "success":
      return {
        label: "正常",
        tone: "success",
        description: "最後の同期は正常に完了しています。",
      };
    case "error":
      return {
        label: "要確認",
        tone: "danger",
        description: "同期で問題が発生しました。状態を確認してください。",
      };
    default:
      return {
        label: "待機中",
        tone: "neutral",
        description: "必要なときに同期を実行できます。",
      };
  }
};

const SettingsChoiceCard = ({
  title,
  description,
  selected = false,
  badge,
  onSelect,
  disabled = false,
}: SettingsChoiceCardProps) => {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </div>
        </div>

        {selected ? (
          <Check className="mt-0.5 h-4 w-4 text-primary-600" />
        ) : null}
      </div>

      {badge ? (
        <div className="mt-3">
          <SettingsBadge tone={selected ? "success" : "neutral"}>
            {badge}
          </SettingsBadge>
        </div>
      ) : null}
    </>
  );

  const className = cn(
    "w-full rounded-2xl border p-4 text-left transition-all",
    selected
      ? "border-primary-300 bg-primary-50/40 ring-1 ring-primary-200/70"
      : "border-slate-200 bg-slate-50/60",
    !disabled && onSelect && "hover:border-slate-300 hover:bg-white",
    disabled && "cursor-default opacity-80",
  );

  if (!onSelect || disabled) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onSelect} className={className}>
      {content}
    </button>
  );
};

type SettingsNavButtonProps = {
  item: SidebarItem;
  active: boolean;
  onSelect: () => void;
};

const SettingsNavButton = ({
  item,
  active,
  onSelect,
}: SettingsNavButtonProps) => {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={item.label}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
        active
          ? "border-primary-300 bg-primary-50/50 text-slate-900 shadow-sm"
          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          active
            ? "border-primary-200 bg-white text-primary-700"
            : "border-slate-200 bg-slate-50 text-slate-500",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.05} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{item.label}</div>
        <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
          {item.description}
        </div>
      </div>
    </button>
  );
};

export const SettingsDialog = ({
  open,
  onOpenChange,
  initialTab,
}: SettingsDialogProps) => {
  const [selectedTab, setSelectedTab] = useState<SettingsTab | null>(null);
  const [imgError, setImgError] = useState(false);

  const resolvedInitialTab = useMemo(
    () => resolveSettingsTab(initialTab),
    [initialTab],
  );
  const activeTab = selectedTab ?? resolvedInitialTab;
  const activeItem = getSidebarItem(activeTab);

  const { currentUser, syncStatus, lastSyncTime, triggerSync } = useAuth();
  const navigate = useNavigate();
  const { folders = [], updateFolder } = useFolders();
  const { settings, updateSettings } = useUserSettings();
  const { settings: syncPrefs, updateSettings: updateSyncPrefs } =
    useSyncSettings();

  const resolvedProfileImageUrl =
    typeof currentUser?.photoURL === "string" &&
    currentUser.photoURL.trim().length > 0
      ? currentUser.photoURL
      : null;

  const hasResolvedProfileImage = Boolean(resolvedProfileImageUrl) && !imgError;

  const footerDisplayName =
    typeof currentUser?.displayName === "string" &&
    currentUser.displayName.trim().length > 0
      ? currentUser.displayName.trim()
      : "User";

  const footerEmail =
    typeof currentUser?.email === "string" &&
    currentUser.email.trim().length > 0
      ? currentUser.email.trim()
      : "Google アカウント";

  const { bg: footerAvatarBg, text: footerAvatarText } =
    getAvatarColors(footerDisplayName);

  const rootFolders = useMemo(() => {
    return [...folders]
      .filter((folder) => {
        if (folder.isDeleted) return false;
        return folder.parentFolderId === null || folder.parentFolderId === "";
      })
      .sort((left, right) => {
        const orderDiff = (left.orderIndex ?? 0) - (right.orderIndex ?? 0);
        if (orderDiff !== 0) return orderDiff;

        return String(left.folderName ?? "").localeCompare(
          String(right.folderName ?? ""),
          "ja",
        );
      });
  }, [folders]);

  const syncEnabledFolderCount = useMemo(() => {
    return rootFolders.filter((folder) => folder.cloudSyncEnabled).length;
  }, [rootFolders]);

  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  const syncStatusMeta = getSyncStatusMeta(syncStatus);

  const ActiveIcon = activeItem.icon;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedTab(null);
    }

    onOpenChange(nextOpen);
  };

  const closeDialog = () => {
    setSelectedTab(null);
    onOpenChange(false);
  };

  const handleSelectTab = (tabId: SettingsTab) => {
    setSelectedTab(tabId);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      closeDialog();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("ログアウトに失敗しました", error);
    }
  };

  const handleGoogleLogin = () => {
    closeDialog();
    navigate("/", { replace: true });
  };

  const handleReviewStartDayChange = async (checked: boolean) => {
    await updateSettings({ reviewStartNextDay: checked });

    try {
      const localDb = await getLocalDb(currentUser?.uid);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const cards = await localDb.cards
        .where("createdAt")
        .aboveOrEqual(todayStart)
        .toArray();

      const cardsToUpdate = cards.filter((card) => {
        const reviewCount = card.reviewCount ?? card.review_count ?? 0;
        return reviewCount <= 0;
      });

      if (cardsToUpdate.length <= 0) {
        return;
      }

      const updates = cardsToUpdate.map((card) => {
        const nextReviewDate = new Date();
        if (checked) {
          nextReviewDate.setDate(nextReviewDate.getDate() + 1);
        }

        nextReviewDate.setHours(0, 0, 0, 0);

        return {
          ...card,
          nextReviewDate,
          updatedAt: new Date(),
        };
      });

      await localDb.cards.bulkPut(updates);
    } catch (error) {
      console.error("Failed to retroactively update card schedules", error);
    }
  };

  const handleReviewButtonToggle = (
    settingKey: ReviewToggleSettingKey,
    checked: boolean,
  ) => {
    if (settingKey === "showReviewHard") {
      return updateSettings({ showReviewHard: checked });
    }

    return updateSettings({ showReviewEasy: checked });
  };

  const handleSyncSettingChange = <K extends keyof SyncSettings>(
    key: K,
    value: SyncSettings[K],
  ) => {
    void updateSyncPrefs({ [key]: value } as Pick<SyncSettings, K>);
  };

  const renderStatusSwitch = (
    enabled: boolean,
    onCheckedChange: (checked: boolean) => void,
  ) => {
    return (
      <div className="flex items-center gap-3">
        <SettingsBadge tone={enabled ? "success" : "neutral"}>
          {getOnOffLabel(enabled)}
        </SettingsBadge>
        <Switch checked={enabled} onCheckedChange={onCheckedChange} />
      </div>
    );
  };

  const renderStudyTab = () => {
    return (
      <div className="space-y-6">
        <SettingsSection
          title="カード編集"
          description="カード編集画面を開いたときの既定動作を整理します。"
        >
          <SettingsRow
            title="カード編集時のプレビュー初期値"
            description="編集画面を開いた直後のプレビュー表示状態を決めます。"
            action={renderStatusSwitch(
              settings?.defaultPreviewEnabled ?? false,
              (checked) =>
                void updateSettings({ defaultPreviewEnabled: checked }),
            )}
          />
          <SettingsRow
            title="オートセーブ（自動下書き）"
            description="編集中の内容を一時保存し、再度開いたときに復元します。"
            action={renderStatusSwitch(
              settings?.autoSaveEnabled ?? true,
              (checked) => void updateSettings({ autoSaveEnabled: checked }),
            )}
          />
          <SettingsRow
            title="ブロック複製を反対側に追加"
            description="複製したブロックを反対側のセクション（問題 / 解答）にも追加します。"
            action={renderStatusSwitch(
              settings?.duplicateToOpposite ?? false,
              (checked) =>
                void updateSettings({ duplicateToOpposite: checked }),
            )}
          />
        </SettingsSection>

        <BlockOrdering />

        <MarkdownWhitespaceSettings />

        <SettingsSection
          title="レビューボタン表示"
          description="レビュー画面に出す評価ボタンを整理します。基準になるボタンは固定表示です。"
        >
          {reviewButtonItems.map((item) => {
            const toggleValue = item.settingKey
              ? (settings?.[item.settingKey] ?? true)
              : true;

            return (
              <SettingsRow
                key={item.id}
                title={item.label}
                description={item.description}
                leading={
                  <span
                    className={cn(
                      "mt-2 block h-3 w-3 rounded-full",
                      item.dotClassName,
                    )}
                  />
                }
                action={
                  item.settingKey ? (
                    renderStatusSwitch(
                      toggleValue,
                      (checked) =>
                        void handleReviewButtonToggle(item.settingKey, checked),
                    )
                  ) : (
                    <SettingsBadge tone="neutral">{item.badge}</SettingsBadge>
                  )
                }
              />
            );
          })}
        </SettingsSection>

        <SettingsSection
          title="スケジュール"
          description="日次レビューの運用と、新規カードの復習開始タイミングを調整します。"
        >
          <SettingsRow
            title="未消化カードの自動繰越"
            description="期限切れのカードを翌日の『今日の復習』に含めます。"
            action={renderStatusSwitch(
              settings?.autoCarryOver ?? true,
              (checked) => void updateSettings({ autoCarryOver: checked }),
            )}
          />
          <SettingsRow
            title="遅延ボーナス"
            description="遅れても思い出せたカードの間隔を、通常より少し長くします。"
            action={renderStatusSwitch(
              settings?.delayBonusEnabled ?? false,
              (checked) => void updateSettings({ delayBonusEnabled: checked }),
            )}
          />
          <SettingsRow
            title="下書き自動判定"
            description="問題または解答が空のカードを、作成中の下書きとして保存します。"
            action={renderStatusSwitch(
              settings?.autoDraftEnabled ?? true,
              (checked) => void updateSettings({ autoDraftEnabled: checked }),
            )}
          />
          <SettingsRow
            title="復習開始日"
            description="新しく作成したカードの初回レビューを当日開始にするか、翌日に送るかを選びます。"
            action={
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors",
                    !(settings?.reviewStartNextDay ?? true) &&
                      "bg-white text-slate-900 shadow-sm",
                  )}
                  onClick={() => void handleReviewStartDayChange(false)}
                >
                  当日
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors",
                    (settings?.reviewStartNextDay ?? true) &&
                      "bg-white text-slate-900 shadow-sm",
                  )}
                  onClick={() => void handleReviewStartDayChange(true)}
                >
                  翌日
                </button>
              </div>
            }
          />
        </SettingsSection>
      </div>
    );
  };

  const renderVoiceTab = () => {
    return (
      <div className="space-y-6">
        <SettingsSection
          title="自動音声再生"
          description="カードを表示したタイミングで自動読み上げを行うかどうかを設定します。"
        >
          <SettingsRow
            title="自動音声再生（問題）"
            description="カードが表示された瞬間に問いかけを読み上げます。"
            action={renderStatusSwitch(
              settings?.autoVoiceQuestion ?? false,
              (checked) => void updateSettings({ autoVoiceQuestion: checked }),
            )}
          />
          <SettingsRow
            title="自動音声再生（解答）"
            description="答えを表示した瞬間に解説を読み上げます。"
            action={renderStatusSwitch(
              settings?.autoVoiceAnswer ?? false,
              (checked) => void updateSettings({ autoVoiceAnswer: checked }),
            )}
          />
        </SettingsSection>

        <SettingsSection
          title="使用する音声"
          description="現行ビルドでは既定音声を使用します。選択式の切り替えUIは将来の拡張用に整理しています。"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {voiceOptions.map((voice) => (
              <SettingsChoiceCard
                key={voice.id}
                title={voice.label}
                description={voice.description}
                selected={voice.selected}
                badge={voice.badge}
                disabled={!voice.selected}
              />
            ))}
          </div>
        </SettingsSection>
      </div>
    );
  };

  const renderTagsTab = () => {
    return (
      <div className="space-y-6">
        <SettingsNote tone="info">
          タグの色、カテゴリ、マージ、階層移動をこの画面からまとめて管理できます。
        </SettingsNote>
        <TagManagerPanel className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]" />
      </div>
    );
  };

  const renderShortcutTab = () => {
    return (
      <div className="space-y-6">
        {shortcutSections.map((section) => (
          <SettingsSection
            key={section.title}
            title={section.title}
            description="キーボード操作をまとめて確認できます。"
          >
            <div className="space-y-3">
              {section.shortcuts.map((shortcut, index) => (
                <div
                  key={`${section.title}-${shortcut.key}-${index}`}
                  className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center"
                >
                  <div className="flex flex-wrap gap-2">
                    {shortcut.key.split(" / ").map((segment) => (
                      <SettingsKeycap
                        key={`${section.title}-${shortcut.key}-${segment}`}
                      >
                        {segment}
                      </SettingsKeycap>
                    ))}
                  </div>
                  <div className="text-sm leading-6 text-slate-700">
                    {shortcut.desc}
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        ))}
      </div>
    );
  };

  const renderSyncTab = () => {
    return (
      <div className="space-y-6">
        <SettingsSection
          title="同期ステータス"
          description="現在の同期状態と最終同期時刻を確認し、必要なら即時同期を実行できます。"
          action={
            <Button
              type="button"
              onClick={() => void triggerSync()}
              disabled={syncStatus === "syncing" || !isOnline}
              className="rounded-2xl"
            >
              {syncStatus === "syncing" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              今すぐ同期
            </Button>
          }
        >
          <SettingsRow
            title="現在の状態"
            description={syncStatusMeta.description}
            leading={
              <div className={SETTINGS_ICON_SURFACE_CLASS_NAME}>
                <Cloud className="h-4 w-4" />
              </div>
            }
            action={
              <SettingsBadge tone={syncStatusMeta.tone}>
                {syncStatusMeta.label}
              </SettingsBadge>
            }
          />
          <SettingsRow
            title="最終同期"
            description="最後にローカルとクラウドの差分を同期した日時です。"
            action={
              <span className="text-sm font-semibold text-slate-700">
                {formatLastSyncTime(lastSyncTime)}
              </span>
            }
          />

          {!isOnline ? (
            <SettingsNote tone="danger">
              現在オフラインです。ネットワーク接続が戻るまで手動同期は実行できません。
            </SettingsNote>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="同期ポリシー"
          description="自動同期の頻度と、ネットワーク利用条件を調整します。"
          action={
            <SettingsBadge tone="info">
              {syncPrefs?.intervalMinutes ?? 5} 分ごと
            </SettingsBadge>
          }
        >
          <SettingsRow
            title="自動同期"
            description="ローカル変更を一定間隔でクラウドに反映します。"
            leading={
              <div className={SETTINGS_ICON_SURFACE_CLASS_NAME}>
                <Cloud className="h-4 w-4" />
              </div>
            }
            action={renderStatusSwitch(syncPrefs?.autoSync ?? true, (checked) =>
              handleSyncSettingChange("autoSync", checked),
            )}
          />
          <SettingsRow
            title="Wi-Fi 接続時のみ同期"
            description="モバイル通信中の自動同期を抑えたい場合に有効です。"
            action={renderStatusSwitch(
              syncPrefs?.wifiOnly ?? false,
              (checked) => handleSyncSettingChange("wifiOnly", checked),
            )}
          />
          <SettingsRow
            title="自動同期の間隔"
            description="バックグラウンドで差分を確認する頻度を選びます。"
            action={
              <Select
                value={String(syncPrefs?.intervalMinutes ?? 5)}
                onValueChange={(value) =>
                  handleSyncSettingChange(
                    "intervalMinutes",
                    Number(value) as SyncSettings["intervalMinutes"],
                  )
                }
              >
                <SelectTrigger className="w-full min-w-[180px] bg-white sm:w-[180px]">
                  <SelectValue placeholder="同期間隔を選択" />
                </SelectTrigger>
                <SelectContent>
                  {syncIntervalOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} 分ごと
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </SettingsSection>

        <SettingsSection
          title="クラウド同期フォルダ"
          description="ルートフォルダ単位でクラウド同期の対象を切り替えられます。"
          action={
            <SettingsBadge tone="neutral">
              {syncEnabledFolderCount} / {rootFolders.length} 有効
            </SettingsBadge>
          }
        >
          {rootFolders.length <= 0 ? (
            <SettingsEmptyState
              title="ルートフォルダがありません。"
              description="フォルダを作成すると、ここからクラウド同期の対象を選べます。"
            />
          ) : (
            <div className="space-y-3">
              {rootFolders.map((folder) => (
                <SettingsRow
                  key={folder.id}
                  title={folder.folderName}
                  description={
                    folder.cloudSyncEnabled
                      ? "このフォルダ配下のデータをクラウド同期に含めます。"
                      : "このフォルダ配下はローカル専用として扱います。"
                  }
                  leading={
                    <div className={SETTINGS_ICON_SURFACE_CLASS_NAME}>
                      <Folder className="h-4 w-4" />
                    </div>
                  }
                  action={renderStatusSwitch(
                    folder.cloudSyncEnabled,
                    (checked) =>
                      void updateFolder(folder.id, {
                        cloudSyncEnabled: checked,
                      }),
                  )}
                />
              ))}
            </div>
          )}

          <SettingsNote tone="info">
            フォルダ単位の切り替えはローカルデータを削除しません。同期対象から外したフォルダも端末内には残ります。
          </SettingsNote>
        </SettingsSection>

        <DeviceSyncSettings />
      </div>
    );
  };

  const renderAccountCard = () => {
    if (!currentUser) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            Google アカウント
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-500">
            設定はログイン後に端末間で同期できます。
          </div>
          <Button
            type="button"
            className="mt-4 w-full rounded-2xl"
            onClick={handleGoogleLogin}
          >
            Googleでログイン
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {hasResolvedProfileImage && resolvedProfileImageUrl ? (
            <img
              src={resolvedProfileImageUrl}
              alt={footerDisplayName}
              className="h-12 w-12 rounded-2xl object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold"
              style={{
                backgroundColor: footerAvatarBg,
                color: footerAvatarText,
              }}
            >
              {getInitials(footerDisplayName)}
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {footerDisplayName}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              {footerEmail}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <SettingsBadge tone={syncStatusMeta.tone}>
            {syncStatusMeta.label}
          </SettingsBadge>
          <span className="text-xs text-slate-500">
            最終同期 {formatLastSyncTime(lastSyncTime)}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full rounded-2xl"
          onClick={() => void handleLogout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "study":
        return renderStudyTab();
      case "voice":
        return renderVoiceTab();
      case "tags":
        return renderTagsTab();
      case "shortcut":
        return renderShortcutTab();
      case "sync":
        return renderSyncTab();
      default:
        return renderStudyTab();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        surface="plain"
        accessibleTitle="設定"
        accessibleDescription="設定項目をカテゴリ別に確認し、学習、音声、タグ、同期の各設定を管理します。"
        className="!w-[min(1160px,calc(100vw-16px))] !max-w-none gap-0 overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50 p-0 shadow-[0_32px_80px_rgba(15,23,42,0.18)]"
        contentWrapperClassName="px-2 py-2 sm:px-4 sm:py-4"
        closeButtonClassName="rounded-full border border-slate-200 bg-white/95 p-1.5 text-slate-500 shadow-sm hover:bg-white hover:text-slate-900"
      >
        <div className="flex h-[min(88vh,780px)] min-h-0 flex-col lg:flex-row">
          <aside className="hidden w-[320px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
            <div className="border-b border-slate-100 px-6 py-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-primary-700">
                Workspace Settings
              </div>
              <div className="mt-4">
                <div className="text-xl font-semibold tracking-tight text-slate-900">
                  設定
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-500">
                  学習体験と同期まわりの既定値を、カテゴリごとにまとめて調整できます。
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <nav className="space-y-5">
                {settingsSidebarSections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {section.label}
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <SettingsNavButton
                          key={item.id}
                          item={item}
                          active={activeTab === item.id}
                          onSelect={() => handleSelectTab(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="border-t border-slate-100 p-4">
              {renderAccountCard()}
            </div>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
              <div className="pr-12">
                <div className="text-lg font-semibold tracking-tight text-slate-900">
                  設定
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  カテゴリを切り替えて各設定を調整できます。
                </div>
              </div>

              <div className="mt-4">
                <Select
                  value={activeTab}
                  onValueChange={(value) =>
                    handleSelectTab(value as SettingsTab)
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {sidebarItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
                <div className="rounded-[28px] border border-slate-200/80 bg-white px-5 py-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={SETTINGS_ICON_SURFACE_CLASS_NAME}>
                        <ActiveIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xl font-semibold tracking-tight text-slate-900">
                          {activeItem.label}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-500">
                          {activeItem.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <SettingsBadge tone={syncStatusMeta.tone}>
                        {syncStatusMeta.label}
                      </SettingsBadge>
                      {currentUser ? (
                        <SettingsBadge tone="info">
                          {footerDisplayName}
                        </SettingsBadge>
                      ) : null}
                    </div>
                  </div>
                </div>

                {renderTabContent()}

                <div className="lg:hidden">{renderAccountCard()}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
