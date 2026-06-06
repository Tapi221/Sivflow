import { Toaster } from "sonner";

const TOAST_BASE_CLASS_NAME = "min-h-0 !rounded-[7px] !border-0 !px-2.5 !py-2";
const TOAST_SURFACE_CLASS_NAME = "!bg-[var(--ds-semantic-color-background-sidebar)] !shadow-[0_8px_20px_rgba(15,23,42,0.08)]";
const TOAST_TEXT_CLASS_NAME = "!font-[var(--app-font-family-sidebar)] !text-[12px] !font-medium !tracking-[-0.012em] !text-[#85827e]";

const SONNER_TOAST_CLASS_NAMES = {
  toast: `${TOAST_BASE_CLASS_NAME} ${TOAST_SURFACE_CLASS_NAME} ${TOAST_TEXT_CLASS_NAME}`,
  title: "text-[13px] font-bold leading-4 tracking-[-0.018em] text-[#111111]",
  description: "mt-0.5 text-[12px] font-medium leading-4 tracking-[-0.012em] text-[#85827e]",
  actionButton: "!h-6 !rounded-[7