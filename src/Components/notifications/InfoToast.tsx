import React, { useEffect } from 'react';
import type { Notification } from '../../types/notification';
import { Info } from 'lucide-react';

interface InfoToastProps {
  notification: Notification;
  onDismiss: () => void;
}

/**
 * INFO レベルの通知
 * 
 * 特徴:
 * - 自動で消える
 * - 邪魔しない
 * - ユーザーの操作不要
 */
export const InfoToast: React.FC<InfoToastProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    // 自動で消える
    if (notification.autoClose && notification.duration) {
      const timer = setTimeout(() => {
        onDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 max-w-sm border border-slate-200 dark:border-slate-700 animate-slide-in-right">
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="flex-shrink-0">
          <Info className="w-5 h-5 text-blue-500" />
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {notification.message}
          </p>
        </div>
      </div>

      {/* プログレスバー（自動で消える場合） */}
      {notification.autoClose && notification.duration && (
        <div className="mt-3 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${notification.duration}ms linear`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
