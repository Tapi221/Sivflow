import { Toaster } from "sonner";

const SONNER_TOAST_CLASS_NAMES = {
  toast: "min-h-0 !rounded-[var(--ds-radius-floating)] !border !border-[var(--ds-semantic-color-border-floating)] !bg-[var(--ds-semantic-color-background-floating)] !px-2.5 !py-2 !text-[12px] !text-[var(--ds-color-neutral-800)] !shadow-[var(--ds-elevation-shadow-floating)] !backdrop-blur-[var(--ds-elevation-blur-floating)]",
  title: "text-[12px] font-semibold leading-4 text-[var(--ds-color-neutral-800)]",
  description: "mt-0.5 text-[11px] leading-4 text-[var(--ds-color-neutral-600)]",
  actionButton: "!h-6 !rounded-[var(--ds-radius-sm)] !border-0 !bg-[var(--ds-semantic-color-action-primary-soft)] !px-2 !text-[11px] !font-semibold !text-[var(--ds-semantic-color-action-primary)] hover:!bg-[var(--ds-semantic-color-interactive-selected-subtle)]",
} as const;

const SONNER_TOAST_STYLE = { width: "260px", minHeight: "36px", padding: "8px 10px" } as const;

const AppSonnerToaster = () => <Toaster position="bottom-right" visibleToasts={3} gap={8} offset={{ bottom: 20, right: 20 }} toastOptions={{ duration: 5000, classNames: SONNER_TOAST_CLASS_NAMES, style: SONNER_TOAST_STYLE }} />;

export { AppSonnerToaster };
