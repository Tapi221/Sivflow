import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
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
  editorBlockSettings: [
    { id: 'text', type: 'text', label: 'テキスト', isVisible: true, orderIndex: 0 },
    { id: 'code', type: 'code', label: 'コード', isVisible: true, orderIndex: 1 },
    { id: 'image', type: 'image', label: '画像', isVisible: true, orderIndex: 2 },
    { id: 'audio', type: 'audio', label: '音声', isVisible: true, orderIndex: 3 },
    { id: 'reference', type: 'reference', label: 'リンク', isVisible: true, orderIndex: 4 },
    { id: 'math', type: 'math', label: '数式', isVisible: true, orderIndex: 5 },
  ],
};

export function useUserSettings() {
  const { currentUser } = useAuth();
  
  const settings = useLiveQuery(
    async () => {
       if (!currentUser) return DEFAULT_SETTINGS;
       const db = await getLocalDb();
       const userSettings = await db.userSettings.get(currentUser.uid);
       return { ...DEFAULT_SETTINGS, ...(userSettings || {}) };
    },
    [currentUser],
    { 
      ...DEFAULT_SETTINGS, 
      accentColor: typeof window !== 'undefined' ? (localStorage.getItem('flashcard-accent-color') || DEFAULT_SETTINGS.accentColor) : DEFAULT_SETTINGS.accentColor 
    }
  );
  
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
      if (!currentUser) return;
      
      const db = await getLocalDb();
      const current = await db.userSettings.get(currentUser.uid);
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
      
      await db.upsert('userSettings', updated);
  }, [currentUser]);

  return {
    settings,
    updateSettings
  };
}
