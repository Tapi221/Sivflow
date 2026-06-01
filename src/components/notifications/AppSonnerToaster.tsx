import { Toaster } from "sonner";

const SONNER_TOAST_CLASS_NAMES = {
  toast: "min-h-0 rounded-xl px-3 py-2 text-[12px] shadow-lg",
  title: "text-[12px] font-semibold leading-4",
  description: "mt-0.5 text-[11px] leading-4",
  actionButton: "h-7 rounded-lg px-2 text-[11px] font-semibold",
  closeButton: "h-5 w-5",
} as const;

const SONNER_TOAST_STYLE = { width: "280px", minHeight: "40px", padding: "8px 12px" } as const;

const AppSonnerToaster = () => <Toaster closeButton richColors position="bottom-right" visibleToasts={3} offset={{ bottom: 20, right: 20 }} toastOptions={{ duration: 5000, classNames: SONNER_TOAST_CLASS_NAMES, style: SONNER_TOAST_STYLE }} />;

export { AppSonnerToaster };
