import { CheckCircle2, X, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'failed';
  error?: string;
  onRetry?: () => void;
  className?: string;
  showIcon?: boolean;
}

export const UploadProgress = ({
  fileName,
  progress,
  status,
  error,
  onRetry,
  className,
  showIcon = true
}: UploadProgressProps) => {
  if (status === 'idle') return null;

  return (
    <div className={cn("w-full space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 truncate flex-1 mr-4">
          {showIcon && (
            <div className="shrink-0">
              {status === 'uploading' && <FileText className="w-4 h-4 text-slate-400" />}
              {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
              {status === 'failed' && <X className="w-4 h-4 text-red-500" />}
            </div>
          )}
          <span className="font-medium text-slate-700 truncate">{fileName}</span>
        </div>
        <span className="text-xs text-slate-400 font-serif shrink-0">
          {Math.round(progress)}%
        </span>
      </div>

      <Progress 
        value={progress} 
        className={cn("h-1.5", status === 'failed' ? "bg-red-100" : "")} 
        // shadcn Progress 'indicator' override via child selector style if needed or use custom styles
        // Assuming standard shadcn implementation, we can target the indicator using [&>div]
        // But for safety, let's just stick to default or simple overrides.
        // If we really want color, we can wrap or use style.
        // For now, remove indicatorClassName which caused error.
      />
      {/* We can force color via style if needed, but let's see default first. 
          Actually, we can use [&>div]:bg-red-500 utility class on the root if convenient.
      */}
      <div className={cn("h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2", status === 'failed' ? "bg-red-100" : "")}>
          <div 
            className={cn("h-full transition-all duration-300", 
                  status === 'failed' ? "bg-red-500" : status === 'completed' ? "bg-primary-600" : "bg-slate-900"
            )} 
            style={{ width: `${progress}%` }}
          />
      </div>

      {status === 'uploading' && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>アップロード中...</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-2 text-xs text-primary-600 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>完了しました</span>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                <X className="w-3 h-3" />
                <span>{error || 'アップロードに失敗しました'}</span>
            </div>
            {onRetry && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onRetry}
                    className="h-6 px-2 text-xs hover:bg-slate-200 text-slate-600"
                >
                    再試行
                </Button>
            )}
        </div>
      )}
    </div>
  );
};
