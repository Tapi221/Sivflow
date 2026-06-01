import { Toaster } from "sonner";

const SONNER_TOAST_CLASS_NAMES = {
  toast: "min-h-0 !rounded-[var(--ds-radius-md)] !border !border-[var(--ds-semantic-color-border-floating)] !bg-[var(--ds-semantic-color-background-floating)] !px-2 !py-1.5 !text-[11px] !text-[var(--ds-color-neutral-800)] !shadow-[var(--ds-elevation-shadow-floating)] !backdrop-blur-[var(--ds-elevation-blur-floating)]",
  title: "text-[11px] font-semibold leading-3 text-[var(--ds-color-neutral-800)]",
  description: "mt-0.5 text-[10px] leading-3 text-[var(--ds-color-neutral-600)]",
  actionButton: "!h-5 !rounded-[var(--ds-radius-sm)] !border-0 !bg-[var(--ds-semantic-color-action-primary-soft)] !px-1.5 !text-[10px] !font-semibold !text-[var(--ds-semantic-color-action-primary)] hover:!bg-[var(--ds-semantic-color-interactive-selected-subtle)]",
} as const;

const SONNER_TOAST_STYLE = { width: "228px", minHeight: "30px", padding: "6px 8px" } as const;

const AppSonnerToaster = () => <Toaster position="bottom-right" visibleToasts={3} gap={6} offset={{ bottom: 16, right: 16 }} toastOptions={{ duration: 5000, classNames: SONNER_TOAST_CLASS_NAMES, style: SONNER_TOAST_STYLE }} />;

export { AppSonnerToaster };
