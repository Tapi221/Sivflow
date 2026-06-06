import { Toaster } from "sonner";

const SONNER_TOAST_CLASS_NAMES = {
  toast: "min-h-0 !rounded-[7px] !border-0 !bg-[var(--ds-semantic-color-background-sidebar)] !px-2.5 !py-2 !font-[var(--app-font-family-sidebar)] !text-[12px] !font-medium !tracking-[-0.012em] !text-[#85827e] !shadow-[0_8px_20px_rgba(15,23,42,0.08)]",
  title: "text-[13px] font-bold leading-4 tracking-[-0.018em] text-[#111111]",
  description: "mt-0.5 text-[12px] font-medium leading-4 tracking-[-0.012em] text-[#85827e]",
  actionButton: "!h-6 !rounded-[7px] !border-0 !bg-transparent !px-2 !text-[12px] !font-bold !tracking-[-0.012em] !text-[#111111] hover:!bg-[rgba(17,17,17,0.06)]",
} as const;

const SONNER_TOAST_STYLE = { width: "236px", minHeight: "36px", padding: "8px 10px" } as const;

const AppSonnerToaster = () => <Toaster position="bottom-right" visibleToasts={3}