import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { AlertTriangle, ChevronDown } from "@/chip/icons/icons";
import type { Notification } from "@/types/notification";



interface WarningDialogProps {
  notification: Notification;
  onDismiss: () => void;
}



const WarningDialog = ({ notification, onDismiss }: WarningDialogProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!notification.closeable) return;
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={handleBackdropMouseDown}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-start gap-3 p-6 border-b border-slate-200">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">
              {notification.title}
            </h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 whitespace-pre-line">
            {notification.message}
          </p>
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
                <div className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-600 whitespace-pre-line">
                  {notification.details}
                </div>
              )}
            </div>
          )}
        </div>
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-3 p-6 border-t border-slate-200">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  if (notification.closeable) {
                    onDismiss();
                  }
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${action.primary
                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



export { WarningDialog };
