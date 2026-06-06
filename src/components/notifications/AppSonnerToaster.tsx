import { Toaster } from "sonner";

const SONNER_TOAST_CLASS_NAMES = {
  toast: "!rounded-[7px] !border-0 !bg-[var(--ds-semantic-color-background-sidebar)] !text-[#85827e] !shadow-sm",
  title: "text-[13px] font-bold text-[#111111]",
  description: "text-[12px] font-medium text-[#85827e]",
  actionButton: "!rounded-[7px] !bg-transparent !text-[#111111]",
} as const;

const SONNER_TOAST_STYLE = {
  width: "236px",
  minHeight: "36px",
  padding: "8px 10px",
} as const;

const AppSonnerToaster = () => (
  <Toaster
    position="bottom-right"
    visibleToasts={3}
    gap={6}
