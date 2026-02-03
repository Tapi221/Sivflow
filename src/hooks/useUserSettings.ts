import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';
import type { UserSettings } from '../types';

export const DEFAULT_SETTINGS: Partial<UserSettings> = {
  displayName: 'UserName',
  profileImage: null,
  theme: 'system',
  language: 'ja',
  weekStartDay: 'monday',
  notificationsEnabled: false,
  soundEnabled: true,

  showReviewHard: true,
  showReviewEasy: true,
  autoCarryOver: true,
  delayBonusEnabled: false,
  reviewStartNextDay: true,
  defaultPreviewEnabled: false,
  autoDraftEnabled: true,
  autoSaveEnabled: true,
  accentColor: '#689A98', // Default system accent color
};

export function useUserSettings() {
  const { currentUser } = useAuth();
  
  const settings = useLiveQuery(
    async () => {
       if (!currentUser) return DEFAULT_SETTINGS;
       const userSettings = await localDb.userSettings.get(currentUser.uid);
       return { ...DEFAULT_SETTINGS, ...(userSettings || {}) };
    },
    [currentUser],
    DEFAULT_SETTINGS
  );
  
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
      if (!currentUser) return;
      
      const current = await localDb.userSettings.get(currentUser.uid);
      const updated = {
          ...current,
          ...newSettings,
          // profileImage のネストされたマージ（フィールド消失を防ぐための最小限のアプローチ）
          profileImage: newSettings.profileImage ? {
              ...(current?.profileImage || {}),
              ...newSettings.profileImage
          } : (current?.profileImage || null),
          userId: currentUser.uid,
          updatedAt: new Date(),
          id: current?.id || currentUser.uid 
      };
      
      // 安全策：ロジックに関わる値が実際に変更された場合のみ更新（パフォーマンスのための浅い比較）
      if (JSON.stringify(current) === JSON.stringify(updated)) return;
      
      await localDb.upsert('userSettings', updated);
  }, [currentUser]);

  return {
    settings,
    updateSettings
  };
}
