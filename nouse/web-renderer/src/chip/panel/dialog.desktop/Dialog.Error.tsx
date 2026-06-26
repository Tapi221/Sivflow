import { useState } from "react";
import { AlertCircle, ChevronDown } from "@web-renderer/chip/icons/icons";
import { DialogDesktopPanel } from "./DialogDesktopPanel";
import type { Notification } from "@/types/notification";



type ErrorDialogProps = {
  notification: Notification;
  onDismiss?: () => void;
};



const ErrorDialog = ({ notification, onDismiss }: ErrorDialogProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const handlePanelClose = () => {
    if (!notification.closeable) return;
    onDismiss?.();
  };
  return (
    <DialogDesktopPanel surfaceClassName="w-full max-w-md" ariaLabel={notification.title} onClose={handlePanelClose}>
      <div className="flex items-start gap-3 border-b border-slate-200 p-6">
        <div className="shrink-0">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {notification.title}
          </h3>
        </div>
      </div>
      <div className="p-6">
        <p className="whitespace-pre-line text-sm text-slate-600">
          {notification.message}
        </p>
        {notification.details ? (
          <div className="mt-4">
            <button type="button" onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              詳細を見る
            </button>
            {showDetails ? (
              <div className="mt-2 rounded bg-slate-50 p-3 font-serif text-xs whitespace-pre-line text-slate-600">
                {notification.details}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex gap-3 border-t border-slate-200 p-6">
        {notification.actions?.map((action, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              action.onClick();
              handlePanelClose();
            }}
            className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${action.primary
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-slate-100 text-slate-900 hover:bg-slate-200"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </DialogDesktopPanel>
  );
};



export { ErrorDialog };
