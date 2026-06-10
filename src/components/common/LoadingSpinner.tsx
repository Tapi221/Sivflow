import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

const DEFAULT_LOADING_LABEL = "読み込み中";
const LOADING_SPINNER_BARS = [
  { opacity: 0.12, transform: "rotate(0 12 12)" },
  { opacity: 0.18, transform: "rotate(30 12 12)" },
  { opacity: 0.24, transform: "rotate(60 12 12)" },
  { opacity: 0.3, transform: "rotate(90 12 12)" },
  { opacity: 0.36, transform: "rotate(120 12 12)" },
  { opacity: 0.42, transform: "rotate(150 12 12)" },
  { opacity: 0.48, transform: "rotate(180 12 12)" },
  { opacity: 0.56, transform: "rotate(210 12 12)" },
  { opacity: 0.64, transform: "rotate(240 12 12)" },
  { opacity: 0.72, transform: "rotate(270 12 12)" },
  { opacity: 0.84, transform: "rotate(300 12 12)" },
  { opacity: 1, transform: "rotate(330 12 12)" },
] as const;

const LoadingSpinner = ({ className, iconClassName, label = DEFAULT_LOADING_LABEL }: LoadingSpinnerProps) => {
  return (
    <div role="status" aria-label={label} className={cn("flex items-center justify-center", className)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("h-5 w-5 animate-spin text-[var(--app-loading-spinner-indicator)]", iconClassName)}>
        {LOADING_SPINNER_BARS.map((bar) => (
          <rect key={bar.transform} x="11" y="1" width="2" height="5" rx="1" fill="currentColor" opacity={bar.opacity} transform={bar.transform} />
        ))}
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export { LoadingSpinner };
export type { LoadingSpinnerProps };
