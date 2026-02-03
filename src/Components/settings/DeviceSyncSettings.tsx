import React, { useEffect, useState } from 'react';
import { firestoreDb } from '../../services/firebase';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import type { SyncMetadata } from '../../types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { SyncService } from '../../services/syncService';
import { LocalDB } from '../../services/localDB';
import { RefreshCw, Pencil, Check, X, Trash2 } from 'lucide-react';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import { SyncServiceFactory } from '../../services/SyncServiceFactory';
import type { UserStats } from '../../types';
import { useSyncSettings } from '../../hooks/useSyncSettings';
import { Switch } from '../ui/switch';

export const DeviceSyncSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<SyncMetadata[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const { settings: syncSettings, updateSettings: updateSyncSettings } = useSyncSettings();

  const fetchStats = async () => {
    if (!currentUser) return;
    initializeDB(currentUser.uid);
    const localDB = getLocalDb();
    const s = await localDB.userStats.get('current') || await localDB.userStats.toCollection().first();
    setStats(s || null);
  };

  const fetchDevices = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(firestoreDb, `sync_metadata/${currentUser.uid}/devices`));
      const snapshot = await getDocs(q);
      const deviceList = snapshot.docs.map(doc => doc.data() as SyncMetadata);
      // 最終同期時刻で降順ソート（新しい順）
      deviceList.sort((a, b) => {
        const timeA = a.lastSyncTime instanceof Timestamp ? a.lastSyncTime.toMillis() : new Date(a.lastSyncTime || 0).getTime();
        const timeB = b.lastSyncTime instanceof Timestamp ? b.lastSyncTime.toMillis() : new Date(b.lastSyncTime || 0).getTime();
        return timeB - timeA;
      });
      setDevices(deviceList);
    } catch (error) {
      console.error('[DeviceSyncSettings] Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    if (!currentUser) return;
    if (!window.confirm('この端末の同期を解除しますか？')) return;
    
    setRemovingId(deviceId);
    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      await syncService.removeDevice(deviceId);
      await fetchDevices();
    } catch (error) {
      console.error('[DeviceSyncSettings] Failed to remove device:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleCleanup = async () => {
    if (!currentUser) return;
    if (!window.confirm('24時間以上同期がない古いセッションを一括解除しますか？\n(シークレットモード等の残骸を掃除します)')) return;

    setCleaning(true);
    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      const cleanedCount = await syncService.cleanupInactiveDevices();
      setCleanupMessage(`${cleanedCount}台の古いセッションを解除しました。`);
      setTimeout(() => setCleanupMessage(null), 3000);
      await fetchDevices();
    } catch (error) {
      console.error('[DeviceSyncSettings] Cleanup failed:', error);
    } finally {
      setCleaning(false);
    }
  };

  const handleUpdateName = async (deviceId: string) => {
    if (!currentUser || !editName.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      await syncService.updateDeviceName(deviceId, editName.trim());
      setEditingId(null);
      await fetchDevices();
    } catch (error) {
      console.error('[DeviceSyncSettings] Failed to update device name:', error);
    }
  };

  const startEditing = (device: SyncMetadata) => {
    setEditingId(device.deviceId);
    setEditName(device.deviceName || '');
  };

  useEffect(() => {
    fetchDevices();
    fetchStats();
  }, [currentUser]);

  const formatDate = (date: any) => {
    if (!date) return '未同期';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'yyyy/MM/dd HH:mm', { locale: ja });
  };

  const totalUsed = stats?.totalStorageUsedBytes || 0;
  const highResUsed = stats?.totalHighResBytes || 0;
  const thumbnailUsed = stats?.totalThumbnailBytes || 0;
  const MAX_QUOTA = 500 * 1024 * 1024; // 500MB
  const quotaPercent = Math.min((totalUsed / MAX_QUOTA) * 100, 100);
  const highResPercent = (highResUsed / MAX_QUOTA) * 100;
  const thumbnailPercent = (thumbnailUsed / MAX_QUOTA) * 100;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-800">
        <div className="p-2.5 bg-primary-600/10 text-primary-600 rounded-xl">
          <Smartphone className="w-6 h-6" />
        </div>
        同期・ストレージ管理
      </h2>

      {/* Sync Settings Toggles */}
      <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-700">非アクティブ端末の自動整理</h4>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              24時間以上同期がない古いセッションを自動的に解除します（シークレットモード等の残骸の掃除）。
            </p>
          </div>
          <Switch 
            checked={syncSettings?.autoCleanupDevices ?? true}
            onCheckedChange={(checked) => updateSyncSettings({ autoCleanupDevices: checked })}
          />
        </div>
      </div>

      {/* Storage Usage Bar */}
      <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="flex justify-between items-end mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">クラウドストレージ使用量</span>
          <span className={`text-[10px] font-bold ${quotaPercent > 90 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
            {formatSize(totalUsed)} / {formatSize(MAX_QUOTA)}
            {quotaPercent > 90 && ' (残りわずか!)'}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${highResPercent}%` }} 
            className={`h-full ${quotaPercent > 90 ? 'bg-red-500' : 'bg-primary-600'}`}
          />
          <div 
            style={{ width: `${thumbnailPercent}%` }} 
            className="h-full bg-indigo-300"
          />
        </div>
        <div className="mt-4 flex gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
            高解像度画像 ({formatSize(highResUsed)})
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-300 rounded-full"></span>
            サムネイル ({formatSize(thumbnailUsed)})
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">登録デバイス ({devices.filter(d => d.isActive).length})</h3>
            <div className="flex items-center gap-3">
              {cleanupMessage && (
                <span className="text-[10px] text-emerald-500 font-bold animate-in slide-in-from-right-2 fade-in">
                  {cleanupMessage}
                </span>
              )}
              <button 
                onClick={handleCleanup}
                disabled={cleaning}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                title="24時間以上動いていない端末を掃除"
              >
                <Trash2 className={`w-3 h-3 ${cleaning ? 'animate-bounce' : ''}`} />
                古いセッションを掃除
              </button>
            </div>
          </div>
          {devices.length === 0 ? (
            <p className="text-slate-300 text-center py-10 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                同期されているデバイスはありません。
            </p>
          ) : (
            devices.map((device) => {
              const isRevoked = device.status === 'revoked';
              const isCurrentDevice = device.deviceId === localStorage.getItem('deviceId');
              
              return (
                <div 
                  key={device.deviceId} 
                  className={`p-5 rounded-2xl border transition-all ${
                    isRevoked 
                      ? 'bg-slate-100 border-slate-200 opacity-60' // Revoked style
                      : device.isActive 
                        ? 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200' 
                        : 'bg-slate-50 border-slate-100 grayscale opacity-70' // Disconnected style
                  } ${isCurrentDevice ? 'ring-2 ring-primary-600/20' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isRevoked ? 'bg-slate-200 text-slate-400' : 'bg-orange-50 text-orange-500'
                  }`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      {editingId === device.deviceId ? (
                        <div className="flex items-center gap-2">
                          <input 
                            autoFocus
                            type="text"
                            title="デバイス名を編集"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(device.deviceId)}
                            className="text-sm font-bold text-slate-700 bg-slate-50 border border-primary-600/30 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-600/20 flex-1"
                          />
                          <button onClick={() => handleUpdateName(device.deviceId)} title="保存" className="p-1 text-primary-600 hover:bg-primary-600/10 rounded-md transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} title="キャンセル" className="p-1 text-slate-300 hover:bg-slate-100 rounded-md transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className={`font-bold text-base flex items-center gap-2 group/title ${
                          isRevoked ? 'text-slate-500 line-through decoration-slate-400/50' : 'text-slate-700'
                        }`}>
                          {device.deviceName || '不明なデバイス'}
                          {!isRevoked && (
                            <button 
                              onClick={() => startEditing(device)}
                              title="名前を編集"
                              className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-300 hover:text-primary-600 transition-all"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {isCurrentDevice && (
                            <span className="text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                              現在使用中
                            </span>
                          )}
                        </h3>
                      )}
                      <p className="text-[10px] text-slate-300 font-mono mt-1">{device.deviceId}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold border ${
                        isRevoked 
                          ? 'bg-slate-200 text-slate-500 border-slate-300' 
                          : device.isActive 
                            ? 'bg-emerald-50 text-emerald-500 border-emerald-100' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {isRevoked ? 'REVOKED (履歴)' : device.isActive ? 'ACTIVE' : 'DISCONNECTED'}
                      </span>
                      {!isRevoked && device.isActive && (
                        <button 
                          disabled={removingId === device.deviceId}
                          onClick={() => handleDisconnect(device.deviceId)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                          title="解除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider mb-1">最終同期</p>
                      <p className="text-xs font-bold text-slate-500">{formatDate(device.lastSyncTime)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider mb-1">高画質同期</p>
                      <p className="text-xs font-bold text-slate-500">{formatDate(device.lastHighResSync)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <button 
        onClick={fetchDevices}
        className="mt-6 w-full py-4 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-white hover:shadow-lg hover:border-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
      >
        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
        同期状態を更新
      </button>

      <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
        <h4 className="text-blue-600 font-bold text-xs mb-2 flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-[10px]">i</span>
          マルチデバイス同期について
        </h4>
        <p className="text-[11px] text-blue-600/70 leading-relaxed font-medium">
          複数の端末で同時に学習を進めることができます。シークレットモード等でログインを繰り返すとデバイス一覧が増えますが、
          「古いセッションを掃除」ボタンでいつでも整理可能です。
        </p>
      </div>
    </div>
  );
};
