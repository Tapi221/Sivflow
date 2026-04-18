import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "@/ui/icons";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 致命的なクラッシュをキャッチし、復旧UIを表示するコンポーネント
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Card className="max-w-md w-full rounded-[32px] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-red-50 pb-6 pt-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-center text-red-800">
                問題が発生しました
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
                アプリケーションの実行中に予期せぬエラーが発生しました。
                データの不整合またはメモリ不足の可能性があります。
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl mb-8 overflow-auto max-h-32">
                <pre className="text-[10px] text-slate-500 font-serif">
                  {this.state.error?.message || "Unknown error"}
                  {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl h-12 font-bold shadow-md transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  アプリを再読み込み
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-6">
                何度もこの画面が表示される場合は、サポートにお問い合わせください。
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
