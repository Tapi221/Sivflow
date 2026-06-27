import { useEffect } from "react";
import { Info } from "@web-renderer/chip/icons/icons";
import type { Notification } from "@/types/notification";



type InfoToastProps = {
  notification: Notification;
  onDismiss: () => void;
};



const InfoToast = ({ notification, onDismiss }: InfoToastProps) => {
  useEffect(() => {
    if (!notification.autoClose || !notification.duration) return undefined;

    const timer = window.setTimeout(() => {
      onDismiss();
    }, notification.duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notification, onDismiss]);

  return (
    <div className="bg-white shadow-lg rounded-2xl p-4 max-w-sm border border-slate-200/60 ring-1 ring-slate-100 animate-slide-in-right">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Info className="w-5 h-5 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-700">
            {notification.title}
          </p>
          <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
        </div>
      </div>

      {notification.autoClose && notification.duration && (
        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all ease-linear"
            style={{
              width: "100%",
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



export { InfoToast };
