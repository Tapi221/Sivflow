import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "@/ui/icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

interface ErrorScreenProps {
  onReset: () => void;
}

export const ErrorScreen = ({ onReset }: ErrorScreenProps) => {
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
          <p className="text-sm text-slate-600 text-center mb-8 leading-relaxed">
            アプリケーションの実行中に予期せぬエラーが発生しました。
            詳細は開発者コンソールに出力されています。
          </p>

          <div className="space-y-3">
            <Button
              onClick={onReset}
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
};

/**
 * 致命的なクラッシュをキャッチし、復旧UIを表示するコンポーネント
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorScreen onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
