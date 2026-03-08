import React, { useState } from "react";
import type { Notification } from "@/types/notification";
import { AlertCircle, ChevronDown } from "@/ui/icons";

interface ErrorDialogProps {
  notification: Notification;
}

/**
 * ERROR レベルの通知
 *
 * 特徴:
 * - 明確なアクション必須
 * - 続行不可
 * - 閉じられない
 */
export const ErrorDialog: React.FC<ErrorDialogProps> = ({ notification }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* ヘッダー */}
        <div className="flex items-start gap-3 p-6 border-b border-slate-200">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">
              {notification.title}
            </h3>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <p className="text-sm text-slate-600 whitespace-pre-line">
            {notification.message}
          </p>

          {/* 詳細（オプション） */}
          {notification.details && (
            <div className="mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
                />
                詳細を見る
              </button>
              {showDetails && (
                <div className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-600 whitespace-pre-line font-serif">
                  {notification.details}
                </div>
              )}
            </div>
          )}
        </div>

        {/* アクション（必須） */}
        <div className="flex gap-3 p-6 border-t border-slate-200">
          {notification.actions?.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                // ERROR は閉じられないので、アクション後も残る
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                action.primary
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};




