import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  SETTINGS_ICON_SURFACE_CLASS_NAME,
  SettingsBadge,
  SettingsEmptyState,
  SettingsNote,
  type SettingsTone,
} from "@/components/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuthSession } from "@/contexts/AuthContext";
import { useCloudStorageStats } from "@/hooks/settings/useCloudStorageStats";
import { useSyncSettings } from "@/hooks/sync/useSyncSettings";
import { cn } from "@/lib/utils";
import { requireAppFirestoreDb } from "@/services/firebaseGateway";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import type { SyncMetadata } from "@/types";
import { Check, Pencil, RefreshCw, Smartphone, Trash2, X } from "@/ui/icons";
import { toDateOrNull, toMillis } from "@/utils/toMillis";

type DeviceStatus = "revoked" | "active" | "disconnected";

type DeviceRecord = SyncMetadata & {
  status?: DeviceStatus;
  revokedAt?: unknown;
};

const numberFormatter = new Intl.NumberFormat("ja-JP");

const sortByLastSyncDesc = (left: DeviceRecord, right: DeviceRecord) => {
  return toMillis(right.lastSyncTime) - toMillis(left.lastSyncTime);
};

const getCurrentDeviceId = () => {
  try {
    const deviceId = localStorage.getItem("deviceId");
    return typeof deviceId === "string" && deviceId.trim().length > 0
      ? deviceId
      : null;
  } catch {
    return null;
  }
};

const formatDate = (value: unknown, fallback: string = "未同期") => {
  const date = toDateOrNull(value);
  if (!date) return fallback;
  return format(date, "yyyy/MM/dd HH:mm", { locale: ja });
};

const formatSize = (bytes: number) => {
  if (bytes <= 0) return "0 B";

  const kilo = 1024;
  const units = ["B", "KB", "MB", "GB"] as const;
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(kilo)),
    units.length - 1,
  );

  return `${parseFloat((bytes / Math.pow(kilo, unitIndex)).toFixed(2))} ${units[unitIndex]}`;
};

const getDeviceStatusMeta = (
  device: DeviceRecord,
): { label: string; tone: SettingsTone } => {
  if (device.status === "revoked") {
    return {
      label: "解除済み",
      tone: "neutral",
    };
  }

  if (device.isActive) {
    return {
      label: "有効",
      tone: "success",
    };
  }

  return {
    label: "停止中",
    tone: "neutral",
  };
};

export const DeviceSyncSettings = () => {
  const { currentUser } = useAuthSession();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const cleanupMessageTimeoutRef = useRef<number | null>(null);

  const { settings: syncSettings, updateSettings: updateSyncSettings } =
    useSyncSettings();
  const {
    stats: storageStats,
    loading: storageStatsLoading,
    error: storageStatsError,
    rebuilding: storageStatsRebuilding,
    refresh: refreshStorageStats,
  } = useCloudStorageStats(currentUser?.uid ?? null);

  const fetchDevices = useCallback(async () => {
    if (!currentUser) {
      setDevices([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const db = requireAppFirestoreDb();
      const devicesQuery = query(
        collection(db, `sync_metadata/${currentUser.uid}/devices`),
      );
      const snapshot = await getDocs(devicesQuery);
      const nextDevices = snapshot.docs.map((doc) => {
        return doc.data() as DeviceRecord;
      });

      nextDevices.sort(sortByLastSyncDesc);
      setDevices(nextDevices);
    } catch (error) {
      console.error("[DeviceSyncSettings] Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleDisconnect = async (deviceId: string) => {
    if (!currentUser) return;
    if (!window.confirm("この端末の同期を解除しますか？")) return;

    setRemovingId(deviceId);

    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      await syncService.removeDevice(deviceId);
      await fetchDevices();
    } catch (error) {
      console.error("[DeviceSyncSettings] Failed to remove device:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleCleanup = async () => {
    if (!currentUser) return;

    if (
      !window.confirm(
        "60日以上同期がない古いセッションを一括解除しますか？\n(シークレットモード等の残骸も整理します)",
      )
    ) {
      return;
    }

    setCleaning(true);

    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      const cleanedCount = await syncService.cleanupInactiveDevices();
      setCleanupMessage(`${cleanedCount} 台の古いセッションを解除しました。`);

      if (cleanupMessageTimeoutRef.current) {
        window.clearTimeout(cleanupMessageTimeoutRef.current);
      }

      cleanupMessageTimeoutRef.current = window.setTimeout(() => {
        setCleanupMessage(null);
      }, 3000);

      await fetchDevices();
    } catch (error) {
      console.error("[DeviceSyncSettings] Cleanup failed:", error);
    } finally {
      setCleaning(false);
    }
  };

  const handleUpdateName = async (deviceId: string) => {
    if (!currentUser) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditingId(null);
      return;
    }

    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      await syncService.updateDeviceName(deviceId, trimmedName);
      setEditingId(null);
      await fetchDevices();
    } catch (error) {
      console.error(
        "[DeviceSyncSettings] Failed to update device name:",
        error,
      );
    }
  };

  const startEditing = (device: DeviceRecord) => {
    setEditingId(device.deviceId);
    setEditName(device.deviceName ?? "");
  };

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    return () => {
      if (cleanupMessageTimeoutRef.current) {
        window.clearTimeout(cleanupMessageTimeoutRef.current);
      }
    };
  }, []);

  const currentDeviceId = useMemo(() => getCurrentDeviceId(), []);
  const activeDeviceCount = useMemo(() => {
    return devices.filter((device) => {
      return device.isActive && device.status !== "revoked";
    }).length;
  }, [devices]);

  const totalUsed = storageStats?.totalStorageUsedBytes ?? 0;
  const syncedImageCount = storageStats?.syncedImageCount ?? 0;
  const maxQuota = storageStats?.quotaBytes ?? 500 * 1024 * 1024;
  const quotaPercent = Math.min((totalUsed / maxQuota) * 100, 100);
  const storageStatsUpdatedAt =
    storageStats?.updatedAt ?? storageStats?.lastRebuiltAt ?? null;
  const formattedSyncedImageCount = `${numberFormatter.format(syncedImageCount)} 件`;

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="端末の自動整理"
        description="一定期間同期がない端末を整理し、不要なセッションを溜め込みにくくします。"
      >
        <SettingsRow
          title="60日以上同期がない端末を自動整理"
          description="シークレットモードや古い端末の残骸を自動的に片付けます。"
          action={
            <div className="flex items-center gap-3">
              <SettingsBadge
                tone={
                  (syncSettings?.autoCleanupDevices ?? true)
                    ? "success"
                    : "neutral"
                }
              >
                {(syncSettings?.autoCleanupDevices ?? true) ? "ON" : "OFF"}
              </SettingsBadge>
              <Switch
                checked={syncSettings?.autoCleanupDevices ?? true}
                onCheckedChange={(checked) =>
                  void updateSyncSettings({ autoCleanupDevices: checked })
                }
              />
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCleanup()}
            disabled={cleaning}
            className="rounded-2xl"
          >
            <Trash2
              className={cn("mr-2 h-4 w-4", cleaning && "animate-pulse")}
            />
            古いセッションを掃除
          </Button>

          {cleanupMessage ? (
            <SettingsBadge tone="success">{cleanupMessage}</SettingsBadge>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="クラウドストレージ使用量"
        description="クラウドに保存された画像アセットの実使用量を確認できます。上限は 500 MB です。"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshStorageStats()}
              disabled={storageStatsLoading || storageStatsRebuilding}
              className="rounded-2xl"
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  (storageStatsLoading || storageStatsRebuilding) &&
                    "animate-spin",
                )}
              />
              使用量を再集計
            </Button>

            {storageStatsError ? (
              <SettingsBadge tone="danger">{storageStatsError}</SettingsBadge>
            ) : null}
          </div>

          {storageStatsLoading && !storageStats ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  {formatSize(totalUsed)} / {formatSize(maxQuota)}
                </div>
                <div
                  className={cn(
                    "text-xs font-semibold",
                    quotaPercent >= 90 ? "text-rose-600" : "text-slate-500",
                  )}
                >
                  {Math.round(quotaPercent)}% 使用中
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    quotaPercent >= 90 ? "bg-rose-500" : "bg-primary-500",
                  )}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    同期済み画像
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {formattedSyncedImageCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    最終集計
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(storageStatsUpdatedAt, "未集計")}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title={`登録デバイス (${activeDeviceCount})`}
        description="端末ごとの同期状態を確認し、名前の変更や解除を行えます。"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchDevices()}
            className="rounded-2xl"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            一覧を更新
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : devices.length <= 0 ? (
          <SettingsEmptyState
            title="同期されているデバイスはありません。"
            description="このアカウントで同期を開始すると、ここに端末一覧が表示されます。"
          />
        ) : (
          <div className="space-y-3">
            {devices.map((device) => {
              const statusMeta = getDeviceStatusMeta(device);
              const isCurrentDevice = currentDeviceId === device.deviceId;
              const isEditing = editingId === device.deviceId;
              const canDisconnect =
                device.status !== "revoked" && device.isActive;

              return (
                <div
                  key={device.deviceId}
                  className={cn(
                    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
                    isCurrentDevice &&
                      "border-primary-300 ring-1 ring-primary-200/60",
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className={cn(
                          SETTINGS_ICON_SURFACE_CLASS_NAME,
                          device.status !== "revoked" && "text-slate-700",
                        )}
                      >
                        <Smartphone className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              autoFocus
                              value={editName}
                              onChange={(event) =>
                                setEditName(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  void handleUpdateName(device.deviceId);
                                }
                                if (event.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                              title="デバイス名"
                              className="h-9 min-w-[220px] max-w-[320px] bg-white"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                void handleUpdateName(device.deviceId)
                              }
                              className="rounded-xl"
                            >
                              <Check className="mr-1 h-4 w-4" />
                              保存
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="rounded-xl"
                            >
                              <X className="mr-1 h-4 w-4" />
                              キャンセル
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <div
                              className={cn(
                                "min-w-0 text-sm font-semibold text-slate-900",
                                device.status === "revoked" &&
                                  "text-slate-500 line-through",
                              )}
                            >
                              {device.deviceName || "不明なデバイス"}
                            </div>

                            {isCurrentDevice ? (
                              <SettingsBadge tone="info">
                                この端末
                              </SettingsBadge>
                            ) : null}

                            <SettingsBadge tone={statusMeta.tone}>
                              {statusMeta.label}
                            </SettingsBadge>
                          </div>
                        )}

                        <div className="mt-1 break-all text-[11px] leading-5 text-slate-500">
                          {device.deviceId}
                        </div>
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="flex shrink-0 items-center gap-2 self-start">
                        {device.status !== "revoked" ? (
                          <button
                            type="button"
                            onClick={() => startEditing(device)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                            aria-label={`${device.deviceName} の名前を編集`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}

                        {canDisconnect ? (
                          <button
                            type="button"
                            disabled={removingId === device.deviceId}
                            onClick={() =>
                              void handleDisconnect(device.deviceId)
                            }
                            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            aria-label={`${device.deviceName} の同期を解除`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        最終同期
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {formatDate(device.lastSyncTime)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        高画質同期
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {formatDate(device.lastHighResSync)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <SettingsNote tone="info">
        複数端末で同時に学習できます。不要な端末を解除しても、ほかの端末やクラウド上のデータは消えません。
      </SettingsNote>
    </div>
  );
};
