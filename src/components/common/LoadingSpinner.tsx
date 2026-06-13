import "pdfjs-dist/legacy/web/pdf_viewer.css";
import "./LoadingSpinner.css";
import { cn } from "@/lib/utils";



type LoadingSpinnerProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
  size?: string;
  text?: string;
};



const DEFAULT_LOADING_LABEL = "読み込み中";
const DEFAULT_LOADING_ICON_CLASS_NAME = "h-5 w-5";



const getLoadingIconClassName = (size: string | undefined, iconClassName: string | undefined): string => {
  if (iconClassName) return iconClassName;
  if (size === "sm") return "h-4 w-4";
  if (size === "lg") return "h-6 w-6";
  return DEFAULT_LOADING_ICON_CLASS_NAME;
};



const LoadingSpinner = ({ className, iconClassName, label, size, text }: LoadingSpinnerProps) => {
  const resolvedLabel = label ?? text ?? DEFAULT_LOADING_LABEL;

  return (
    <div role="status" aria-label={resolvedLabel} className={cn("flex items-center justify-center", className)}>
      <span aria-hidden="true" className={cn("app-loading-spinner__icon", getLoadingIconClassName(size, iconClassName))}>
        <span className="loadingIcon" />
      </span>
      <span className="sr-only">{resolvedLabel}</span>
    </div>
  );
};



export { LoadingSpinner };


export type { LoadingSpinnerProps };
