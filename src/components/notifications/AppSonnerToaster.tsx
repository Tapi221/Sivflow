import { Toaster } from "sonner";

const SONNER_TOAST_CLASS_NAMES = {
  toast: "!rounded-[7px] !border-0 !bg-[var(--ds-semantic-color-background-sidebar)] !text-[#85827e] !shadow-sm",
  title: "text-[13px] font-bold text-[#111111]",
  description: "text-[12px] font-medium text-[#85827e]",
  actionButton: "!rounded-[7px] !bg-transparent !text-[#111111]",
} as const;

const AppSonnerToaster = () => <Toaster position="bottom-right" toastOptions={{ classNames: SONNER_TOAST_CLASS