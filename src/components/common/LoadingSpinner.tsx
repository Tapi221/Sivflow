import "pdfjs-dist/legacy/web/pdf_viewer.css";
import "./LoadingSpinner.css";
import { cn } from "@/lib/utils";



type LoadingSpinnerProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};



const DEFAULT_LOADING_LABEL = "読み込み中";
const DEFAULT_LOADING_ICON_CLASS_NAME = "h-5 w-5";



const LoadingSpinner = ({ className, iconClassName, label = DEFAULT_LOADING_LABEL }: LoadingSpinnerProps) => {
  return (
    <div role="status" aria-label={label} className={cn("flex items-center justify-center", className)}>
      <span aria-hidden="true" className={cn("app-loading-spinner__icon", iconClassName || DEFAULT_LOADING_ICON_CLASS_NAME)}>
        <span className="loadingIcon" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
};



export { LoadingSpinner };


export type { LoadingSpinnerProps };
