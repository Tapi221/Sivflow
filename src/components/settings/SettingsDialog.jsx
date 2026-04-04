import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  User,
  Tag,
  Volume2,
  Database,
  LogOut,
  X,
  Check,
  Folder,
  Layers,
  Camera,
  Loader2,
  RefreshCw,
  Calendar,
  ChevronRight,
  Keyboard,
  Cloud,
} from "@/ui/icons";
import { getLocalDb } from "@/services/localDB";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useFolders } from "@/hooks/folder/useFolders";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { useNavigate } from "react-router-dom";
import { uploadProfileImage } from "@/services/imageUploadService";
import { useReliableFileUpload } from "@/hooks/platform/useReliableFileUpload";
import { Slider } from "@/components/ui/slider";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { BookOpen } from "@/ui/icons";
import { StorageManager } from "./StorageManager";
import {
  createUploadedImage,
  createFailedUploadedImage,
} from "@/utils/uploaded-image/factory";
import { isHeicFile, convertHeicToJpeg } from "@/utils/uploaded-image/heic";
import { compressAndConvertToBase64 } from "@/utils/uploaded-image/imageCompression";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import {
  EXPLORER_ROW_BASE_CLASS_NAME,
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import DataRescuePanel from "@/components/settings/DataRescuePanel";
import { DeviceSyncSettings } from "@/components/settings/DeviceSyncSettings";
import { BlockOrdering } from "@/components/settings/BlockOrdering";
import { useSyncSettings } from "@/hooks/sync/useSyncSettings";
import {
  validateUsername,
  truncateUsername,
  countUnicodeCharacters,
} from "@/utils/userValidation";
import { TagManagerPanel } from "@/components/tag/TagManagerPanel";

const sidebarItems = [
  { id: "account", label: "アカウント", icon: User },
  { id: "study", label: "学習設定", icon: BookOpen },
  { id: "theme", label: "テーマカラー", icon: Layers },
  { id: "tags", label: "タグ管理", icon: Tag },
  { id: "voice", label: "音声設定", icon: Volume2 },
  { id: "shortcut", label: "ショートカット", icon: Keyboard },
  { id: "sync", label: "同期設定", icon: RefreshCw },
  { id: "data", label: "データ", icon: Database },
];

const voiceOptions = [
  { id: "kore", label: "Kore" },
  { id: "puck", label: "Puck" },
  { id: "charon", label: "Charon" },
  { id: "fenrir", label: "Fenrir" },
  { id: "zephyr", label: "Zephyr" },
];

const ACCENT_COLORS = [
  {
    id: "#689A98",
    label: "Teal",
    gradient: "linear-gradient(135deg, #689A98 0%, #90B8B6 100%)",
  },
  {
    id: "#3B82F6",
    label: "Blue",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
  },
  {
    id: "#10B981",
    label: "Green",
    gradient: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  },
  {
    id: "#F59E0B",
    label: "Amber",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  },
  {
    id: "#EF4444",
    label: "Red",
    gradient: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  },
  {
    id: "#8B5CF6",
    label: "Violet",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
  },
];

const FALLBACK_ACCENT_COLORS = [
  {
    id: "#689A98",
    label: "Teal",
    gradient: "linear-gradient(135deg, #689A98 0%, #90B8B6 100%)",
  },
  {
    id: "#3B82F6",
    label: "Blue",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
  },
  {
    id: "#10B981",
    label: "Green",
    gradient: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  },
  {
    id: "#F59E0B",
    label: "Amber",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  },
  {
    id: "#EF4444",
    label: "Red",
    gradient: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  },
  {
    id: "#8B5CF6",
    label: "Violet",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
  },
];

const folderSidebarDisplayModeOptions = [
  {
    id: "auto",
    label: "自動",
    description: "現在の構成に合わせてツリー表示と遷移表示を自動で切り替えます",
  },
  {
    id: "tree",
    label: "ツリー表示",
    description: "フォルダ全体を常に1本のツリーとして表示します",
  },
  {
    id: "navigation",
    label: "遷移表示",
    description: "最上位フォルダ一覧から入り、選択後はその配下だけを表示します",
  },
];

const SettingsDialog = ({ open, onOpenChange, initialTab }) => {
  const [activeTab, setActiveTab] = useState("account");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // タブの初期化と同期
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const fileInputRef = useRef(null);
  const { currentUser, syncStatus, lastSyncTime, triggerSync } = useAuth();
  const navigate = useNavigate();
  const { folders = [], updateFolder } = useFolders();
  const { settings, updateSettings } = useUserSettings();

  const storedProfileImageUrl = settings?.profileImage?.remoteUrl;
  const googleProfileImageUrl =
    typeof currentUser?.photoURL === "string" &&
    currentUser.photoURL.trim().length > 0
      ? currentUser.photoURL
      : null;
  const hasStoredProfileImage =
    typeof storedProfileImageUrl === "string" &&
    storedProfileImageUrl.length > 0 &&
    !storedProfileImageUrl.startsWith("blob:");
  const resolvedProfileImageUrl = hasStoredProfileImage
    ? storedProfileImageUrl
    : googleProfileImageUrl;
  const hasResolvedProfileImage = !!resolvedProfileImageUrl && !imgError;

  // Reset imgError when profileImage remoteUrl changes
  useEffect(() => {
    setImgError(false);
  }, [settings?.profileImage?.remoteUrl, currentUser?.photoURL]);

  // Debug: Log profileImage changes (検証用)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[Settings] loaded profileImage", settings?.profileImage);
      const remoteUrl = settings?.profileImage?.remoteUrl;
      if (typeof remoteUrl === "string" && remoteUrl.startsWith("blob:")) {
        console.warn(
          "[Settings] blob remoteUrl detected on render:",
          remoteUrl,
        );
      }
    }
  }, [settings?.profileImage?.remoteUrl, settings?.profileImage?.updatedAt]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  /**
   * プロフィール画像アップロード処理
   *
   * 新仕様:
   * - Firebase Storage の downloadURL のみを settings に保存
   * - スキーマ: { remoteUrl: string | null; updatedAt: number }
   */
  const handleImageUpload = async (event) => {
    // Prevent multiple concurrent uploads
    if (uploadingImage) return;

    // Avoid React event pooling issues - preserve input element reference
    const inputEl = event.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;

    if (import.meta.env.DEV) {
      console.log(
        "[ProfileImage] Upload started:",
        file.name,
        file.type,
        file.size,
      );
    }
    setUploadingImage(true);

    try {
      let processedFile = file;

      // HEIC形式を JPEG に変換
      if (isHeicFile(file)) {
        if (import.meta.env.DEV) {
          console.log("[ProfileImage] Converting HEIC to JPEG...");
        }
        processedFile = await convertHeicToJpeg(file);
        if (import.meta.env.DEV) {
          console.log("[ProfileImage] Conversion complete");
        }
      }

      if (!currentUser?.uid) {
        throw new Error("ユーザーIDが見つかりません");
      }

      // Firebase Storage にアップロード
      if (import.meta.env.DEV) {
        console.log("[ProfileImage] Uploading to Firebase Storage...");
      }
      const downloadUrl = await uploadProfileImage({
        uid: currentUser.uid,
        file: processedFile,
      });

      if (import.meta.env.DEV) {
        console.log("[ProfileImage] ✅ Upload successful");
      }

      // settings に保存: シンプルなスキーマ
      const profileImageData = {
        remoteUrl: downloadUrl,
        updatedAt: Date.now(),
      };
      await updateSettings({
        profileImage: profileImageData,
      });
      if (import.meta.env.DEV) {
        console.log("[Settings] saved profileImage", profileImageData);
        console.log("[ProfileImage] Settings saved successfully");
      }
    } catch (error) {
      console.error("[ProfileImage] ❌ Upload failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[ProfileImage] Error:", errorMessage);
    } finally {
      setUploadingImage(false);
      // ファイル入力をリセット（event pooling対策）
      inputEl.value = "";
    }
  };

  const handleNameEdit = () => {
    setTempDisplayName(settings?.displayName || "UserName");
    setEditingName(true);
  };

  const handleNameSave = async () => {
    const result = validateUsername(tempDisplayName);
    if (!result.isValid) {
      setNameError(result.message);
      return;
    }

    await updateSettings({ displayName: tempDisplayName.trim() });
    setEditingName(false);
    setNameError("");
  };

  const handleNameCancel = () => {
    setEditingName(false);
    setTempDisplayName("");
    setNameError("");
  };

  const { settings: syncPrefs, updateSettings: updateSyncPrefs } =
    useSyncSettings();
  const accentColorsForRender =
    typeof ACCENT_COLORS !== "undefined" &&
    Array.isArray(ACCENT_COLORS) &&
    ACCENT_COLORS.length > 0
      ? ACCENT_COLORS
      : FALLBACK_ACCENT_COLORS;

  const handleReviewStartDayChange = async (checked) => {
    // 1. Update setting
    await updateSettings({ reviewStartNextDay: checked });

    // 2. Retroactively update TODAY's new cards (0 reviews)
    try {
      const localDb = await getLocalDb(currentUser?.uid);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch cards created today
      const cards = await localDb.cards
        .where("createdAt")
        .aboveOrEqual(todayStart)
        .toArray();

      const cardsToUpdate = cards.filter((c) => {
        // Only fresh cards
        const reviews = c.reviewCount ?? c.review_count ?? 0;
        if (reviews > 0) return false;
        return true;
      });

      if (cardsToUpdate.length > 0) {
        const updates = cardsToUpdate.map((c) => {
          const newDate = new Date(); // Today
          if (checked) {
            // Switch to Tomorrow
            newDate.setDate(newDate.getDate() + 1);
          }
          newDate.setHours(0, 0, 0, 0);

          return {
            ...c,
            nextReviewDate: newDate,
            updatedAt: new Date(),
          };
        });

        await localDb.cards.bulkPut(updates);
        console.log(
          `[Settings] Updated schedule for ${updates.length} cards to ${checked ? "Tomorrow" : "Today"}`,
        );
      }
    } catch (e) {
      console.error("Failed to retroactively update card schedules", e);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        const displayName = settings?.displayName || "UserName";
        const { bg: avatarBg, text: avatarText } = getAvatarColors(
          settings?.displayName,
        );

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Profile Image Section */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-600">
                プロフィール画像
              </div>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                <div className="relative group">
                  <div
                    style={{
                      backgroundColor: hasResolvedProfileImage ? "transparent" : avatarBg,
                    }}
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-white shadow-lg relative ring-2 ring-slate-100"
                  >
                    {hasResolvedProfileImage ? (
                      <img
                        src={resolvedProfileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(
                            "[Settings] Profile image load failed:",
                            e.currentTarget.src,
                          );
                          setImgError(true);
                        }}
                      />
                    ) : (
                      <span style={{ color: avatarText }}>
                        {getInitials(displayName)}
                      </span>
                    )}
                  </div>

                  {/* Upload overlay */}
                  <button
                    onClick={() => {
                      if (uploadingImage) return;
                      fileInputRef.current?.click();
                    }}
                    className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer"
                    disabled={uploadingImage}
                  >
                    <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="rounded-xl border-slate-200/80 bg-white/60 text-slate-600 backdrop-blur-sm hover:bg-white/78 hover:text-slate-900 hover:border-slate-300 font-bold text-sm shadow-sm"
                    disabled={uploadingImage}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingImage ? "アップロード中..." : "画像を変更"}
                  </Button>

                  {/* Upload Status */}
                  {uploadingImage && (
                    <div className="text-xs text-slate-500">
                      アップロード中...
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    JPG、PNG、HEIC形式に対応しています (最大10MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Username Section */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-600 flex justify-between items-center">
                <span>ユーザー名</span>
                {editingName && (
                  <span
                    className={cn(
                      "text-[10px] font-serif font-bold",
                      countUnicodeCharacters(tempDisplayName.trim()) > 20
                        ? "text-red-500"
                        : "text-slate-400",
                    )}
                  >
                    {countUnicodeCharacters(tempDisplayName.trim())} / 20
                  </span>
                )}
              </div>
              {editingName ? (
                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <Input
                      value={tempDisplayName}
                      onChange={(e) => {
                        setTempDisplayName(e.target.value);
                        if (nameError) setNameError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tempDisplayName.trim())
                          handleNameSave();
                        if (e.key === "Escape") handleNameCancel();
                      }}
                      placeholder="ユーザー名を入力"
                      className={cn(
                        "flex-1 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-primary-100",
                        nameError &&
                          "border-red-500 focus-visible:ring-red-100",
                      )}
                      autoFocus
                    />
                    <Button
                      onClick={handleNameSave}
                      size="sm"
                      disabled={!tempDisplayName.trim()}
                      className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:bg-primary-600/50 text-white rounded-xl font-bold shadow-md shadow-primary-200"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleNameCancel}
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-slate-200/80 bg-white/60 text-slate-500 backdrop-blur-sm hover:bg-white/78 hover:text-slate-700 font-bold"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {nameError && (
                    <p className="text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                      {nameError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white/62 border border-slate-200/80 rounded-xl backdrop-blur-sm p-4 flex items-center justify-between group shadow-sm">
                  <div className="min-w-0 flex-1 mr-4">
                    <div
                      className="font-bold text-lg text-slate-800 truncate"
                      title={displayName}
                    >
                      {truncateUsername(displayName)}
                    </div>
                    <div className="text-slate-500 text-sm truncate">
                      {currentUser?.email || "email@example.com"}
                    </div>
                  </div>
                  <Button
                    onClick={handleNameEdit}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl font-bold shrink-0"
                  >
                    編集
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 px-1 tracking-wide">
                ストレージ管理
              </h3>
              <StorageManager />
            </div>
          </div>
        );

      case "tags":
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <TagManagerPanel />
          </div>
        );
      case "voice":
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <div className="bg-white/58 border border-slate-200/70 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm backdrop-blur-sm hover:bg-white/66 hover:border-slate-200/80 transition-colors">
                <div>
                  <div className="font-bold text-slate-700 text-sm tracking-tight">
                    自動音声再生 (問題)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    カードが表示された瞬間に問いかけを読み上げます
                  </div>
                </div>
                <Switch
                  checked={settings?.autoVoiceQuestion ?? false}
                  onCheckedChange={(checked) =>
                    updateSettings({ autoVoiceQuestion: checked })
                  }
                />
              </div>

              <div className="bg-white/58 border border-slate-200/70 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm backdrop-blur-sm hover:bg-white/66 hover:border-slate-200/80 transition-colors">
                <div>
                  <div className="font-bold text-slate-700 text-sm tracking-tight">
                    自動音声再生 (解答)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    答えを表示した瞬間に解説を読み上げます
                  </div>
                </div>
                <Switch
                  checked={settings?.autoVoiceAnswer ?? false}
                  onCheckedChange={(checked) =>
                    updateSettings({ autoVoiceAnswer: checked })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                使用する音声 (GEMINI TTS)
              </div>
              <div className="grid grid-cols-2 gap-4">
                {voiceOptions.map((voice) => (
                  <div
                    key={voice.id}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all font-bold text-sm flex items-center justify-between",
                      voice.id === "kore"
                        ? "border-primary-400 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    {voice.label}
                    {voice.id === "kore" && <Check className="w-4 h-4" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "study":
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-bold text-slate-700 text-[13px] tracking-tight">
                      カード編集時のプレビュー初期値
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      編集画面を開いた時のプレビューのデフォルト状態
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-tighter",
                        (settings?.defaultPreviewEnabled ?? false)
                          ? "text-primary-700"
                          : "text-slate-400",
                      )}
                    >
                      {(settings?.defaultPreviewEnabled ?? false)
                        ? "ON"
                        : "OFF"}
                    </span>
                    <Switch
                      checked={settings?.defaultPreviewEnabled ?? false}
                      onCheckedChange={(checked) =>
                        updateSettings({ defaultPreviewEnabled: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-200/60 pt-4">
                  <div>
                    <div className="font-bold text-slate-700 text-[13px] tracking-tight">
                      オートセーブ（自動下書き）
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      編集中の内容を一時的に保存し、復元します
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-tighter",
                        (settings?.autoSaveEnabled ?? true)
                          ? "text-primary-700"
                          : "text-slate-400",
                      )}
                    >
                      {(settings?.autoSaveEnabled ?? true) ? "ON" : "OFF"}
                    </span>
                    <Switch
                      checked={settings?.autoSaveEnabled ?? true}
                      onCheckedChange={(checked) =>
                        updateSettings({ autoSaveEnabled: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-200/60 pt-4">
                  <div>
                    <div className="font-bold text-slate-700 text-[13px] tracking-tight">
                      ブロック複製を反対側に追加
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      複製した際、反対側のセクション（問題⇔解答）に追加
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-tighter",
                        (settings?.duplicateToOpposite ?? false)
                          ? "text-primary-700"
                          : "text-slate-400",
                      )}
                    >
                      {(settings?.duplicateToOpposite ?? false) ? "ON" : "OFF"}
                    </span>
                    <Switch
                      checked={settings?.duplicateToOpposite ?? false}
                      onCheckedChange={(checked) =>
                        updateSettings({ duplicateToOpposite: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <BlockOrdering />
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="font-bold text-slate-700 text-sm mb-4">
                  レビューボタン表示設定
                </div>
                <div className="space-y-4">
                  {/* 0: 忘れた (Forgot) - Always shown */}
                  <div className="flex items-start gap-4 rounded-lg border border-slate-200/60 bg-white/28 p-3">
                    <div className="mt-1 opacity-80">
                      <div className="w-8 h-8 rounded-full bg-red-50 face-badge-convex flex items-center justify-center text-[#FF5A65]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" stroke="none" />
                          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-700 text-sm">
                          忘れた
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        思い出せなかったカード。復習間隔はほぼリセットされ、しっかり復習が必要です。
                      </div>
                    </div>
                  </div>

                  {/* 1: あいまい (Vague/Hard) - Toggleable */}
                  <div className="flex items-start gap-4 rounded-lg border border-slate-200/60 bg-white/28 p-3">
                    <div className="mt-1 opacity-80">
                      <div className="w-8 h-8 rounded-full bg-amber-50 face-badge-convex flex items-center justify-center text-[#F9A825]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="8" y1="15" x2="16" y2="15" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-700 text-sm">
                          あいまい
                        </div>
                        <Switch
                          checked={settings?.showReviewHard ?? true}
                          onCheckedChange={(checked) =>
                            updateSettings({ showReviewHard: checked })
                          }
                        />
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        復習間隔は覚えたカードよりも控えめに伸び、段階的に強化されます。
                      </div>
                    </div>
                  </div>

                  {/* 2: 覚えた (Good) - Always shown */}
                  <div className="flex items-start gap-4 rounded-lg border border-slate-200/60 bg-white/28 p-3">
                    <div className="mt-1 opacity-80">
                      <div className="w-8 h-8 rounded-full bg-blue-50 face-badge-convex flex items-center justify-center text-[#00A3FF]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-700 text-sm">
                          覚えた
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        忘却曲線に基づき少しずつ復習間隔が伸び、安定的に覚えられます。
                      </div>
                    </div>
                  </div>

                  {/* 3: 余裕 (Easy) - Toggleable */}
                  <div className="flex items-start gap-4 rounded-lg border border-slate-200/60 bg-white/28 p-3">
                    <div className="mt-1 opacity-80">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 face-badge-convex flex items-center justify-center text-[#00B67A]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 13s1.5 3 4 3 4-3 4-3" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-700 text-sm">
                          余裕
                        </div>
                        <Switch
                          checked={settings?.showReviewEasy ?? true}
                          onCheckedChange={(checked) =>
                            updateSettings({ showReviewEasy: checked })
                          }
                        />
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        次回復習までの間隔を覚えたカードより少し伸ばせます。より効率的に復習可能。
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="font-bold text-slate-700 text-sm mb-4">
                  スケジュール設定
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-700 text-sm">
                      未消化カードの自動繰越
                    </div>
                    <div className="text-xs text-slate-500">
                      期限切れのカードを翌日の「今日の復習」に含めます
                    </div>
                  </div>
                  <Switch
                    checked={settings?.autoCarryOver ?? true}
                    onCheckedChange={(checked) =>
                      updateSettings({ autoCarryOver: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <div className="font-bold text-slate-700 text-sm">
                      遅延ボーナス
                    </div>
                    <div className="text-xs text-slate-500">
                      遅れても思い出せた場合、復習間隔を通常より長くします
                    </div>
                  </div>
                  <Switch
                    checked={settings?.delayBonusEnabled ?? false}
                    onCheckedChange={(checked) =>
                      updateSettings({ delayBonusEnabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <div className="font-bold text-slate-700 text-sm">
                      下書き自動判定
                    </div>
                    <div className="text-xs text-slate-500">
                      問題や解答が空の場合に、自動的に下書き（作成中）として保存します
                    </div>
                  </div>
                  <Switch
                    checked={settings?.autoDraftEnabled ?? true}
                    onCheckedChange={(checked) =>
                      updateSettings({ autoDraftEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                  <div>
                    <div className="font-bold text-slate-700 text-sm">
                      復習開始日
                    </div>
                    <div className="text-xs text-slate-500">
                      作成したカードの初回の復習をいつから始めるか設定します
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        !(settings?.reviewStartNextDay ?? true)
                          ? "text-primary-700"
                          : "text-slate-400",
                      )}
                    >
                      当日
                    </span>
                    <Switch
                      checked={settings?.reviewStartNextDay ?? true}
                      onCheckedChange={handleReviewStartDayChange}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        (settings?.reviewStartNextDay ?? true)
                          ? "text-primary-700"
                          : "text-slate-400",
                      )}
                    >
                      翌日
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "theme":
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-bold text-slate-600">
                  フォルダサイドバー表示
                </div>
                <div className="grid gap-3">
                  {folderSidebarDisplayModeOptions.map((option) => {
                    const isSelected =
                      (settings?.folderSidebarDisplayMode ?? "auto") ===
                      option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          updateSettings({
                            folderSidebarDisplayMode: option.id,
                          })
                        }
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-left transition-all",
                          isSelected
                            ? "border-primary-400 bg-primary-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div
                              className={cn(
                                "text-sm font-bold",
                                isSelected
                                  ? "text-primary-700"
                                  : "text-slate-700",
                              )}
                            >
                              {option.label}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {option.description}
                            </div>
                          </div>
                          {isSelected ? (
                            <Check className="mt-0.5 h-4 w-4 text-primary-600" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Settings */}
              <div className="space-y-4">
                <div className="text-sm font-bold text-slate-600">
                  アクセントカラー
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {accentColorsForRender.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => updateSettings({ accentColor: color.id })}
                      className={cn(
                        "aspect-square rounded-xl flex items-center justify-center transition-all relative group overflow-hidden",
                        settings?.accentColor === color.id
                          ? "ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-md scale-105"
                          : "hover:scale-105 hover:shadow-sm ring-1 ring-slate-100",
                      )}
                      style={{ background: color.gradient }}
                    >
                      {settings?.accentColor === color.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                          <Check
                            className="w-5 h-5 text-white drop-shadow-md"
                            strokeWidth={3}
                          />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-1 text-[9px] font-bold text-white text-center bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {color.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case "sync":
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-full ${syncStatus === "syncing" ? "bg-blue-500/20 text-blue-300" : syncStatus === "error" ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"} backdrop-blur-sm`}
                  >
                    <RefreshCw
                      className={`w-6 h-6 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">
                      {syncStatus === "syncing"
                        ? "同期中..."
                        : syncStatus === "error"
                          ? "同期エラー"
                          : "同期ステータス"}
                    </div>
                    <div className="text-xs text-slate-400 font-serif mt-1">
                      最終同期:{" "}
                      {!lastSyncTime
                        ? "未同期"
                        : new Date(lastSyncTime).toLocaleString("ja-JP")}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={triggerSync}
                  disabled={syncStatus === "syncing" || !navigator.onLine}
                  className="bg-white/10 text-slate-200 border border-white/10 hover:bg-white/20 hover:text-white shadow-sm backdrop-blur-sm"
                >
                  {syncStatus === "syncing" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  今すぐ同期
                </Button>
              </div>
              {!navigator.onLine && (
                <div className="text-xs text-red-300 font-bold bg-red-500/10 p-2 rounded-lg text-center border border-red-500/20">
                  現在オフラインです。インターネット接続を確認してください。
                </div>
              )}
            </div>

            {/* Primary Sync Settings */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Sync Interval */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      同期間隔
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      バッテリー消費を抑えたい場合は間隔を長くしてください
                    </p>
                  </div>
                  <Select
                    value={String(syncPrefs.intervalMinutes)}
                    onValueChange={(val) =>
                      updateSyncPrefs({ intervalMinutes: Number(val) })
                    }
                  >
                    <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 rounded-xl font-bold text-sm text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/10 bg-black/90 backdrop-blur-xl text-slate-200">
                      <SelectItem
                        value="5"
                        className="font-bold focus:bg-white/10 focus:text-white"
                      >
                        5分ごと
                      </SelectItem>
                      <SelectItem
                        value="15"
                        className="font-bold focus:bg-white/10 focus:text-white"
                      >
                        15分ごと
                      </SelectItem>
                      <SelectItem
                        value="30"
                        className="font-bold focus:bg-white/10 focus:text-white"
                      >
                        30分ごと
                      </SelectItem>
                      <SelectItem
                        value="60"
                        className="font-bold focus:bg-white/10 focus:text-white"
                      >
                        1時間ごと
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-white/10 w-full" />

              {/* WiFi Only Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    WiFi接続時のみ同期
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    モバイルデータ通信量を節約できます
                  </p>
                </div>
                <Switch
                  checked={syncPrefs.wifiOnly}
                  onCheckedChange={(checked) =>
                    updateSyncPrefs({ wifiOnly: checked })
                  }
                />
              </div>
            </div>

            {/* Folder Sync Settings */}
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-xs font-bold text-slate-400 mb-4 px-1 uppercase tracking-widest">
                フォルダごとの同期設定
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {rootFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Folder
                        className={cn(
                          "w-5 h-5",
                          folder.cloudSyncEnabled
                            ? "text-primary-400"
                            : "text-slate-500",
                        )}
                      />
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-bold ${folder.cloudSyncEnabled ? "text-slate-200" : "text-slate-500"}`}
                        >
                          {folder.folderName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {folder.cloudSyncEnabled
                            ? "クラウド同期: 有効"
                            : "このデバイスのみに保存"}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={folder.cloudSyncEnabled !== false}
                      onCheckedChange={(checked) =>
                        updateFolder(folder.id || folder.folderId, {
                          cloudSyncEnabled: checked,
                        })
                      }
                    />
                  </div>
                ))}
                {rootFolders.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs font-bold">
                    フォルダがありません
                  </div>
                )}
              </div>
            </div>

            {/* Device & Storage Management */}
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-6">
                {/* Cloud Sync Status */}
                <div
                  className={cn(
                    "p-6 rounded-2xl border flex items-center justify-between relative overflow-hidden",
                    currentUser
                      ? "bg-primary-50 border-primary-100"
                      : "bg-slate-50 border-slate-200",
                  )}
                >
                  <div className="relative z-10">
                    <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <Cloud
                        className={cn(
                          "w-5 h-5",
                          currentUser ? "text-primary-600" : "text-slate-400",
                        )}
                      />
                      クラウド同期
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentUser
                        ? `同期中: ${currentUser.email}`
                        : "ログインしてデータを安全に保存・同期しましょう"}
                    </p>
                  </div>
                  <div className="relative z-10">
                    {currentUser ? (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-[10px] font-bold text-primary-700 border border-primary-200 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                          有効
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={onGoogleLogin}
                        className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold shadow-sm"
                      >
                        ログイン / アカウント作成
                      </Button>
                    )}
                  </div>
                </div>

                {/* Data Rescue Panel */}
                <div className="pt-6 border-t border-slate-200">
                  <DataRescuePanel />
                </div>

                {/* Device Management */}
                <div className="pt-6 border-t border-slate-200">
                  <DeviceSyncSettings />
                </div>
              </div>
            </div>
          </div>
        );
      case "data":
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <DataRescuePanel />
          </div>
        );
      case "shortcut":
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-6">
              {[
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
                      desc: "Quick Open - カード/フォルダ/タグを検索",
                    },
                    {
                      key: "Ctrl + Shift + F",
                      desc: "Global Search - 全文検索",
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
                    { key: "← / →", desc: "日付の移動" },
                    { key: "↑ / ↓", desc: "週の移動" },
                  ],
                },
                {
                  title: "カードエディタ",
                  shortcuts: [
                    {
                      key: "Tab",
                      desc: "入力項目の移動 (タイトル → 問題 → 解答)",
                    },
                    { key: "Shift + Tab", desc: "前の入力項目へ移動" },
                    {
                      key: "Ctrl + V",
                      desc: "画像を貼り付け（画像ブロックへのホバー時）",
                    },
                  ],
                },
                {
                  title: "作業ビュー",
                  shortcuts: [
                    {
                      key: "Ctrl + N",
                      desc: "新規カード作成（フォルダ選択時）",
                    },
                    {
                      key: "Ctrl + Shift + N",
                      desc: "新規フォルダ作成（フォルダ選択時）",
                    },
                    { key: "F2", desc: "選択アイテムのリネーム" },
                    {
                      key: "Del / Backspace",
                      desc: "選択アイテムの削除（確認あり）",
                    },
                    { key: "Enter", desc: "カードを開く（編集表示）" },
                    { key: "↑ / ↓", desc: "前/次のアイテムへ移動" },
                    { key: "→", desc: "フォルダを展開 / 子要素へ移動" },
                    { key: "←", desc: "フォルダを折りたたみ / 親要素へ移動" },
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    {section.title}
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {section.shortcuts.map((s, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-serif text-primary-700 font-bold w-1/3">
                              <span className="bg-primary-50 px-2 py-1 rounded-md border border-primary-100 text-xs inline-block min-w-[30px] text-center">
                                {s.key}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-medium">
                              {s.desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        surface="panel"
        className="w-full max-w-none h-[100dvh] md:max-w-[1120px] md:w-full md:h-[80vh] md:max-h-[800px] p-0 gap-0 flex flex-col overflow-hidden data-[state=open]:duration-300 ring-0 outline-none rounded-none md:rounded-[10px]"
      >
        <DialogDescription className="sr-only">
          アカウント、学習、同期、データ管理などの設定を行うダイアログです。
        </DialogDescription>
        <div className="flex flex-1 h-full overflow-hidden bg-transparent">
          {/* Sidebar */}
          <div
            className={`
              md:w-[248px] flex-shrink-0 flex flex-col border-r border-slate-200/80
              ${isMobileMenuOpen ? "absolute inset-0 z-50 w-full bg-white" : "hidden md:flex bg-white"}
              transition-all duration-300
            `}
          >
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 custom-scrollbar">
              {sidebarItems.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  data-selected={activeTab === item.id ? "true" : undefined}
                  className={cn(
                    EXPLORER_ROW_BASE_CLASS_NAME,
                    "sidebar-row--folder cursor-pointer rounded-[4px] px-2 snap-start",
                  )}
                >
                  <div className={EXPLORER_ROW_ICON_SLOT_CLASS}>
                    <item.icon
                      className={cn(
                        FOLDER_ROW_ICON_SIZE_CLASS,
                        activeTab === item.id
                          ? FOLDER_ROW_ICON_ACTIVE_CLASS
                          : FOLDER_ROW_ICON_MUTED_CLASS,
                      )}
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className={EXPLORER_ROW_CONTENT_CLASS}>
                    <span className={FOLDER_ROW_TITLE_CLASS}>{item.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* User Info / Logout */}
            <div className="border-t border-slate-200 px-4 py-4">
              <div className="mb-3 flex items-center gap-3 px-2">
                <div
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white shadow-sm"
                  style={
                    hasResolvedProfileImage
                      ? undefined
                      : {
                          backgroundColor: getAvatarColors(settings?.displayName)
                            .bg,
                          color: getAvatarColors(settings?.displayName).text,
                        }
                  }
                >
                  {hasResolvedProfileImage ? (
                    <img
                      src={resolvedProfileImageUrl}
                      alt="User avatar"
                      className="h-full w-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    getInitials(settings?.displayName)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-800">
                    {settings?.displayName || "User"}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {currentUser?.email}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-9 w-full justify-start gap-2 px-2 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  if (confirm("ログアウトしてもよろしいですか？")) {
                    handleLogout();
                  }
                }}
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </Button>
            </div>
          </div>

          {/* Content Content - Reverted from glass-content */}
          <div className="relative flex-1 overflow-x-hidden overflow-y-auto bg-transparent">
            {/* Mobile Header */}
            <div className="md:hidden sticky top-0 z-20 flex items-center justify-between p-3 bg-white/70 border-b border-slate-200/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-slate-800">
                  設定
                </DialogTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-slate-600 h-10 w-10"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="text-slate-600 h-10 w-10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
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
