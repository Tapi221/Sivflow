/* eslint-disable react-refresh/only-export-components -- context hook/provider are intentionally co-located exports. */
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      // 自動で消える
      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string) => {
      addToast({ type: "success", message });
    },
    [addToast],
  );

  const error = useCallback(
    (message: string) => {
      addToast({ type: "error", message, duration: 6000 });
    },
    [addToast],
  );

  const warning = useCallback(
    (message: string) => {
      addToast({ type: "warning", message });
    },
    [addToast],
  );

  const info = useCallback(
    (message: string) => {
      addToast({ type: "info", message });
    },
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}





