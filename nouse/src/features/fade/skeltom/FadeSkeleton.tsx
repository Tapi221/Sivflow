import { cn } from "@web-renderer/lib/utils";



type FadeSkeletonProps = {
  ariaLabel?: string;
  className?: string;
  itemClassName?: string;
  rowCount?: number;
  indentCycle?: number;
  indentStepPx?: number;
  widths?: number[];
  animated?: boolean;
};



const DEFAULT_WIDTHS = [80, 70, 60];



const FadeSkeleton = ({ ariaLabel = "読み込み中", className, itemClassName, rowCount = 8, indentCycle = 4, indentStepPx = 14, widths = DEFAULT_WIDTHS, animated = false }: FadeSkeletonProps) => {
  const normalizedIndentCycle = Math.max(1, indentCycle);
  const normalizedWidths = widths.length > 0 ? widths : DEFAULT_WIDTHS;

  return (
    <div className={cn("space-y-2 px-2 pt-1", animated && "animate-pulse", className)} aria-label={ariaLabel}>
      {Array.from({ length: rowCount }, (_, index) => {
        const width = normalizedWidths[index % normalizedWidths.length] ?? DEFAULT_WIDTHS[0];

        return <div key={index} className={cn("h-4 rounded-full bg-[#eef0f3]", itemClassName)} style={{ marginLeft: (index % normalizedIndentCycle) * indentStepPx, width: `${width}%` }} />;
      })}
    </div>
  );
};



export { FadeSkeleton };
