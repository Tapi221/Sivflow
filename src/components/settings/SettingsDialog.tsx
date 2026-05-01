import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { BlockOrdering } from "@/components/settings/BlockOrdering";
import { DeviceSyncSettings } from "@/components/settings/DeviceSyncSettings";
import { MarkdownWhitespaceSettings } from "@/components/settings/MarkdownWhitespaceSettings";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { TagManagerPanel } from "@/components/tag/TagManagerPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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

type ReviewToggleSettingKey = "showReviewHard" | "showReviewEasy";

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

const getBadgeClassName = (
  tone: "neutral" | "success" | "info" | "danger",
) => {
  return cn(
    "inline-flex h-8 min-w-[56px] items-center justify-center rounded-full border px-3 text-[11px] font-bold tracking-[0.14em]",
    tone === "neutral" && "border-slate-200 bg-slate-100 text-slate-600",
    tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
    tone === "info" && "border-sky-200 bg-sky-50 text-sky-700",
    tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
  );
};

const getSyncStatusMeta = (status: string) => {
  switch (status) {
    case "syncing":
      return {
        label: "同期中",
        tone: "info" as const,
        description: "ネットワークとローカル変更を照合しています。",
      };
    case "success":
      return {
        label: "正常",
        tone: "success" as const,
        description: "最後の同期は正常に完了しています。",
      };
    case "error":
      return {
        label: "要確認",
        tone: "danger" as const,
        description: "同期で問題が発生しました。状態を確認してください。",
      };
    default:
      return {
        label: "待機中",
        tone: "neutral" as const,
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Check className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      {badge ? (
        <div className="mt-4">
          <span
            className={getBadgeClassName(selected ? "success" : "neutral")}
          >
            {badge}
          </span>
        </div>
      ) : null}
    </>
  );

  const className = cn(
    "w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition",
    selected && "border-emerald-200 bg-emerald-50/70",
    !selected && !disabled && "hover:border-slate-300 hover:bg-white",
    disabled && "cursor-not-allowed opacity-90",
  );

  if (!onSelect) {
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          active
            ? "border-white/20 bg-white/10 text-white"
            : "border-slate-200 bg-white text-slate-500",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.05} />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span
          className={cn(
            "mt-1 block text-xs leading-5",
            active ? "text-slate-200" : "text-slate-500",
          )}
        >
          {item.description}
        </span>
      </span>
    </button>
  );
};

const SettingsDialog = ({
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
  const ActiveItemIcon = activeItem.icon;

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
    typeof currentUser?.email === "string" && currentUser.email.trim().length > 0
      ? currentUser.email.trim()
      : "ログイン中のメールアドレスなし";

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

  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  const syncStatusMeta = getSyncStatusMeta(syncStatus);

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

  const handleSyncIntervalChange = (value: string) => {
    const nextValue = Number(value);
    const normalizedValue = syncIntervalOptions.includes(
      nextValue as (typeof syncIntervalOptions)[number],
    )
      ? (nextValue as SyncSettings["intervalMinutes"])
      : 5;

    return updateSyncPrefs({ intervalMinutes: normalizedValue });
  };

  const renderStatusSwitch = (
    enabled: boolean,
    onCheckedChange: (checked: boolean) => void,
  ) => {
    return (
      <div className="flex items-center gap-3">
        <span className={getBadgeClassName(enabled ? "success" : "neutral")}>
          {getOnOffLabel(enabled)}
        </span>
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
                      "block h-2.5 w-2.5 rounded-full",
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
                    <span className={getBadgeClassName("neutral")}>
                      {item.badge}
                    </span>
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
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition",
                    !(settings?.reviewStartNextDay ?? true)
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                  onClick={() => void handleReviewStartDayChange(false)}
                >
                  当日
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition",
                    (settings?.reviewStartNextDay ?? true)
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900",
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

  const renderShortcutTab = () => {
    return (
      <div className="space-y-6">
        {shortcutSections.map((section) => (
          <SettingsSection
            key={section.title}
            title={section.title}
            description="キーボード操作をまとめて確認できます。"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
              {section.shortcuts.map((shortcut, index) => (
                <div
                  key={`${section.title}-${shortcut.key}-${index}`}
                  className={cn(
                    "grid gap-3 px-4 py-4 md:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] md:items-center",
                    index > 0 && "border-t border-slate-200",
                  )}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {shortcut.key.split(" / ").map((segment) => (
                      <span
                        key={`${section.title}-${shortcut.key}-${segment}`}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm"
                      >
                        {segment}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm leading-6 text-slate-600">
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
              variant="outline"
              className="rounded-xl"
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
            leading={<Cloud className="h-4 w-4" />}
            action={
              <span className={getBadgeClassName(syncStatusMeta.tone)}>
                {syncStatusMeta.label}
              </span>
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
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              現在オフラインです。ネットワーク接続を確認してから同期を実行してください。
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="自動同期"
          description="バックグラウンドでの同期ルールを調整します。"
        >
          <SettingsRow
            title="自動同期を有効にする"
            description="変更内容を一定間隔で自動的にクラウドへ反映します。"
            action={renderStatusSwitch(
              syncPrefs?.autoSync ?? true,
              (checked) => void updateSyncPrefs({ autoSync: checked }),
            )}
          />
          <SettingsRow
            title="Wi-Fi 接続時のみ同期"
            description="モバイル回線や不安定な回線での自動同期を避けます。"
            action={renderStatusSwitch(
              syncPrefs?.wifiOnly ?? false,
              (checked) => void updateSyncPrefs({ wifiOnly: checked }),
            )}
          />
          <SettingsRow
            title="同期間隔"
            description="自動同期の実行間隔を選択します。"
            action={
              <Select
                value={String(syncPrefs?.intervalMinutes ?? 5)}
                onValueChange={(value) => void handleSyncIntervalChange(value)}
              >
                <SelectTrigger className="w-[148px] bg-white">
                  <SelectValue placeholder="同期間隔" />
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
          title="フォルダごとの同期"
          description="ルートフォルダ単位でクラウド同期の対象を切り替えられます。"
        >
          {rootFolders.length > 0 ? (
            rootFolders.map((folder) => (
              <SettingsRow
                key={folder.id}
                title={folder.folderName || "名称未設定フォルダ"}
                description="このフォルダ配下のデータをクラウド同期対象に含めます。"
                leading={<Folder className="h-4 w-4" />}
                action={renderStatusSwitch(
                  folder.cloudSyncEnabled ?? true,
                  (checked) =>
                    void updateFolder(folder.id, { cloudSyncEnabled: checked }),
                )}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              同期対象を切り替えられるルートフォルダがまだありません。
            </div>
          )}
        </SettingsSection>

        <DeviceSyncSettings />
      </div>
    );
  };

  const renderTagsTab = () => {
    return (
      <div className="space-y-6">
        <SettingsSection
          title="タグ管理"
          description="タグ階層、カテゴリ、色、マージ、削除をまとめて管理します。"
          bodyClassName="mt-5"
        >
          <TagManagerPanel />
        </SettingsSection>
      </div>
    );
  };

  const renderActiveTab = () => {
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
        accessibleDescription="学習体験と同期まわりの既定値を調整します。"
        overlayClassName="bg-slate-900/18 backdrop-blur-[2px]"
        contentWrapperClassName="items-center justify-center p-4 md:p-8"
        className="!w-[min(1180px,calc(100vw-96px))] !max-w-none h-[min(86vh,820px)] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-0 shadow-[0_32px_90px_rgba(15,23,42,0.22)]"
      >
        <div className="ds-settings-panel flex h-full min-h-0 overflow-hidden rounded-[28px] bg-slate-50">
          <aside className="hidden w-[320px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
            <div className="border-b border-slate-200 px-6 py-6">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-emerald-700">
                Workspace Settings
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
                設定
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                学習体験と同期まわりの既定値を、カテゴリごとにまとめて調整できます。
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-5">
                {settingsSidebarSections.map((section) => (
                  <section key={section.id}>
                    <div className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {section.label}
                    </div>
                    <div className="mt-3 space-y-2">
                      {section.items.map((item) => (
                        <SettingsNavButton
                          key={item.id}
                          item={item}
                          active={item.id === activeTab}
                          onSelect={() => handleSelectTab(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  {hasResolvedProfileImage && resolvedProfileImageUrl ? (
                    <img
                      src={resolvedProfileImageUrl}
                      alt={`${footerDisplayName} のアイコン`}
                      className="h-12 w-12 rounded-2xl object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black"
                      style={{
                        backgroundColor: footerAvatarBg,
                        color: footerAvatarText,
                      }}
                    >
                      {getInitials(footerDisplayName)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {footerDisplayName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {footerEmail}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={getBadgeClassName(syncStatusMeta.tone)}>
                    {syncStatusMeta.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    最終同期 {formatLastSyncTime(lastSyncTime)}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleLogout()}
                  className="mt-4 w-full rounded-xl"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </Button>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur md:px-6">
              <div className="lg:hidden">
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

              <div className="mt-0 lg:mt-0">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 px-4 py-4 md:px-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm">
                        <ActiveItemIcon className="h-5 w-5" />
                      </span>

                      <div className="min-w-0">
                        <DialogTitle className="text-[28px] font-black leading-none tracking-tight text-slate-900">
                          {activeItem.label}
                        </DialogTitle>
                        <DialogDescription className="mt-3 text-sm leading-7 text-slate-500">
                          {activeItem.description}
                        </DialogDescription>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={getBadgeClassName(syncStatusMeta.tone)}>
                        {syncStatusMeta.label}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                        {footerDisplayName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
