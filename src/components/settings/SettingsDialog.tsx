import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { BlockOrdering } from "@/components/settings/BlockOrdering";
import { DeviceSyncSettings } from "@/components/settings/DeviceSyncSettings";
import { MarkdownWhitespaceSettings } from "@/components/settings/MarkdownWhitespaceSettings";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
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
import { TagManagerPanel } from "@/components/tag/TagManagerPanel";
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
  X,
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

const getSyncStatusMeta = (status: string) => {
  switch (status) {
    case "syncing":
      return {
        label: "同期中",
        toneClassName: "ds-settings-panel__status-pill--info",
        description: "ネットワークとローカル変更を照合しています。",
      };
    case "success":
      return {
        label: "正常",
        toneClassName: "ds-settings-panel__status-pill--success",
        description: "最後の同期は正常に完了しています。",
      };
    case "error":
      return {
        label: "要確認",
        toneClassName: "ds-settings-panel__status-pill--danger",
        description: "同期で問題が発生しました。状態を確認してください。",
      };
    default:
      return {
        label: "待機中",
        toneClassName: "ds-settings-panel__status-pill--off",
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
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        </div>

        {selected ? (
          <Check className="mt-0.5 h-4 w-4 text-[var(--settings-accent)]" />
        ) : null}
      </div>

      {badge ? (
        <div className="mt-3">
          <span
            className={cn(
              "ds-settings-panel__status-pill",
              selected && "ds-settings-panel__status-pill--success",
              !selected && "ds-settings-panel__status-pill--off",
            )}
          >
            {badge}
          </span>
        </div>
      ) : null}
    </>
  );

  const className = cn(
    "ds-settings-panel__choice-card",
    selected && "ds-settings-panel__choice-card--active",
    disabled && "ds-settings-panel__choice-card--disabled",
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
      title={item.label}
      className={cn(
        "ds-nav-action ds-settings-panel__nav-item flex w-full items-center gap-3 text-left",
        active && "ds-nav-action--active",
      )}
    >
      <Icon
        className="h-4 w-4 shrink-0 ds-nav-action__icon"
        strokeWidth={2.05}
      />
      <span className="ds-settings-panel__nav-label truncate">
        {item.label}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      setIsMobileMenuOpen(false);
    }

    onOpenChange(nextOpen);
  };

  const closeDialog = () => {
    setSelectedTab(null);
    setIsMobileMenuOpen(false);
    onOpenChange(false);
  };

  const handleSelectTab = (tabId: SettingsTab) => {
    setSelectedTab(tabId);
    setIsMobileMenuOpen(false);
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

  const renderStatusSwitch = (
    enabled: boolean,
    onCheckedChange: (checked: boolean) => void,
  ) => {
    return (
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "ds-settings-panel__status-pill",
            enabled
              ? "ds-settings-panel__status-pill--success"
              : "ds-settings-panel__status-pill--off",
          )}
        >
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
                      "mt-1 block h-2.5 w-2.5 rounded-full",
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
                    <span className="ds-settings-panel__status-pill ds-settings-panel__status-pill--off">
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
              <div className="ds-settings-panel__segmented">
                <button
                  type="button"
                  className={cn(
                    "ds-settings-panel__segmented-button",
                    !(settings?.reviewStartNextDay ?? true) &&
                      "ds-settings-panel__segmented-button--active",
                  )}
                  onClick={() => void handleReviewStartDayChange(false)}
                >
                  当日
                </button>
                <button
                  type="button"
                  className={cn(
                    "ds-settings-panel__segmented-button",
                    (settings?.reviewStartNextDay ?? true) &&
                      "ds-settings-panel__segmented-button--active",
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
          <div className="ds-settings-panel__choice-grid md:grid-cols-2">
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
            <div className="ds-settings-panel__shortcut-table">
              {section.shortcuts.map((shortcut, index) => (
                <div
                  key={`${section.title}-${shortcut.key}-${index}`}
                  className="ds-settings-panel__shortcut-row"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {shortcut.key.split(" / ").map((segment) => (
                      <span
                        key={`${section.title}-${shortcut.key}-${segment}`}
                        className="ds-settings-panel__keycap"
                      >
                        {segment}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-slate-700">{shortcut.desc}</div>
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
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50"
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
            action={
              <span
                className={cn(
                  "ds-settings-panel__status-pill",
                  syncStatusMeta.toneClassName,
                )}
              >
                {syncStatusMeta.label}
              </span>
            }
          />
          <SettingsRow
            title="最終同期"
            description="最後にローカルとクラウドの差分を同期した日時です。"
            action={
              <span className="text-xs font-semibold text-slate-600">
                {formatLastSyncTime(lastSyncTime)}
              </span>
            }
          />

          {!isOnline ? (
            <div className="ds-settings-panel__note ds-settings-panel__note--danger mt-4">
              現在オフラインです。インターネット接続を確認してから同期してください。
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="自動同期"
          description="バックグラウンド同期の間隔と、通信条件を調整します。"
        >
          <SettingsRow
            title="同期間隔"
            description="バッテリー消費を抑えたい場合は、間隔を長めにしてください。"
            action={
              <Select
                value={String(syncPrefs.intervalMinutes)}
                onValueChange={(value) =>
                  void updateSyncPrefs({
                    intervalMinutes: Number(
                      value,
                    ) as SyncSettings["intervalMinutes"],
                  })
                }
              >
                <SelectTrigger className="w-[160px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syncIntervalOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value === 60 ? "1時間ごと" : `${value}分ごと`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          <SettingsRow
            title="Wi-Fi 接続時のみ同期"
            description="モバイルデータ通信量を抑えたいときに有効にします。"
            action={renderStatusSwitch(
              syncPrefs.wifiOnly,
              (checked) => void updateSyncPrefs({ wifiOnly: checked }),
            )}
          />
        </SettingsSection>

        <SettingsSection
          title="フォルダごとの同期"
          description="クラウドに保存するフォルダと、この端末のみに保持するフォルダを切り分けます。"
        >
          {rootFolders.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white">
              {rootFolders.map((folder, index) => (
                <div
                  key={folder.id}
                  className={cn(
                    index > 0 && "border-t border-slate-200",
                    "px-4",
                  )}
                >
                  <SettingsRow
                    title={folder.folderName}
                    description={
                      folder.cloudSyncEnabled
                        ? "クラウド同期: 有効"
                        : "このデバイスのみに保存"
                    }
                    leading={
                      <Folder
                        className={cn(
                          "h-4 w-4",
                          folder.cloudSyncEnabled
                            ? "text-[var(--settings-accent)]"
                            : "text-slate-400",
                        )}
                      />
                    }
                    action={renderStatusSwitch(
                      folder.cloudSyncEnabled !== false,
                      (checked) =>
                        void updateFolder(folder.id || folder.folderId, {
                          cloudSyncEnabled: checked,
                        }),
                    )}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-settings-panel__empty-state">
              フォルダがまだありません。
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title="クラウドアカウント"
          description="ログイン状態を確認し、クラウド同期を有効にします。"
        >
          <SettingsRow
            title={currentUser?.email ?? "ログインしていません"}
            description={
              currentUser
                ? "このアカウントでクラウド同期が有効です。"
                : "ログインすると端末間でデータを安全に同期できます。"
            }
            leading={
              <Cloud
                className={cn(
                  "h-4 w-4",
                  currentUser
                    ? "text-[var(--settings-accent)]"
                    : "text-slate-400",
                )}
              />
            }
            action={
              currentUser ? (
                <span className="ds-settings-panel__status-pill ds-settings-panel__status-pill--success">
                  有効
                </span>
              ) : (
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                >
                  ログイン / アカウント作成
                </Button>
              )
            }
          />
        </SettingsSection>

        <DeviceSyncSettings />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "study":
        return renderStudyTab();
      case "tags":
        return <TagManagerPanel />;
      case "voice":
        return renderVoiceTab();
      case "shortcut":
        return renderShortcutTab();
      case "sync":
        return renderSyncTab();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        surface="panel"
        className="ds-settings-panel w-full max-w-none h-[100dvh] md:max-w-[1120px] md:w-full md:h-[82vh] md:max-h-[820px] p-0 gap-0 flex flex-col overflow-hidden data-[state=open]:duration-300 ring-0 outline-none rounded-none md:rounded-[24px]"
      >
        <DialogTitle className="sr-only">設定</DialogTitle>
        <DialogDescription className="sr-only">
          学習、同期、データ管理などの設定を行うダイアログです。
        </DialogDescription>

        <div className="ds-settings-panel__shell flex flex-1 overflow-hidden">
          <div
            className={cn(
              "ds-settings-panel__sidebar md:w-[260px] flex-shrink-0 flex flex-col border-r",
              isMobileMenuOpen
                ? "absolute inset-0 z-50 w-full"
                : "hidden md:flex",
            )}
          >
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
              <div className="ds-settings-panel__nav">
                {settingsSidebarSections.map((section) => (
                  <section
                    key={section.id}
                    className="ds-settings-panel__nav-section"
                    aria-label={section.label}
                  >
                    <div className="ds-settings-panel__nav-section-label">
                      {section.label}
                    </div>

                    <div className="ds-settings-panel__nav-section-items">
                      {section.items.map((item) => (
                        <SettingsNavButton
                          key={item.id}
                          item={item}
                          active={activeTab === item.id}
                          onSelect={() => handleSelectTab(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="ds-settings-panel__footer border-t px-4 py-4">
              <div className="mb-3 flex items-center gap-3 rounded-xl px-2 py-1.5">
                <div
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
                  style={
                    hasResolvedProfileImage
                      ? undefined
                      : {
                          backgroundColor: footerAvatarBg,
                          color: footerAvatarText,
                        }
                  }
                >
                  {hasResolvedProfileImage ? (
                    <img
                      src={resolvedProfileImageUrl ?? undefined}
                      alt="User avatar"
                      className="h-full w-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    getInitials(footerDisplayName)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-800">
                    {footerDisplayName}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {currentUser?.email ?? "未ログイン"}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                className="h-9 w-full justify-start gap-2 rounded-xl px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  if (confirm("ログアウトしてもよろしいですか？")) {
                    void handleLogout();
                  }
                }}
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </div>

          <div className="ds-settings-panel__content relative flex-1 overflow-x-hidden overflow-y-auto">
            <div className="ds-settings-panel__mobile-header md:hidden sticky top-0 z-20 flex items-center justify-between border-b px-3 py-3">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  {activeItem.label}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="h-10 w-10 text-slate-600"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDialog}
                  className="h-10 w-10 text-slate-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="hidden md:flex ds-settings-panel__desktop-header sticky top-0 z-10 items-start justify-between border-b px-8 py-6">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Settings
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {activeItem.label}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {activeItem.description}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={closeDialog}
                className="mt-1 h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div
              className={cn(
                "w-full space-y-6 p-4 pb-[var(--ui-safe-area-bottom-padding)] md:px-8 md:py-6 lg:px-10 lg:py-8",
                activeTab === "tags" && "space-y-4",
              )}
            >
              {renderContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;


