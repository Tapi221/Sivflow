import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

const DEFAULT_LOADING_LABEL = "読み込み中";

const LoadingSpinner = ({ className, iconClassName, label = DEFAULT_LOADING_LABEL }: LoadingSpinnerProps) => {
  return (
    <div role="status" aria-label={label} className={cn("flex items-center justify-center", className)}>
      <span aria-hidden="true" className={cn("h-5 w-5 animate-spin rounded-full border-2 border-[var(--app-loading-spinner-track)] border-t-[var(--app-loading-spinner-indicator)]", iconClassName)} />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export { LoadingSpinner };
export type { LoadingSpinnerProps };
