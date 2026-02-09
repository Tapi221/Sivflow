import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

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
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearCache = async () => {
    if (confirm('データベースのキャッシュをクリアして再起動しますか？\n(クラウドに同期されていないデータは失われる可能性があります)')) {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
      localStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          {/* @ts-ignore */}
          <Card className="max-w-md w-full rounded-[32px] border-none shadow-xl overflow-hidden">
            {/* @ts-ignore */}
            <CardHeader className="bg-red-50 pb-6 pt-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              {/* @ts-ignore */}
              <CardTitle className="text-center text-red-800">問題が発生しました</CardTitle>
            </CardHeader>
            {/* @ts-ignore */}
            <CardContent className="p-8 pt-6">
              <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
                アプリケーションの実行中に予期せぬエラーが発生しました。
                データの不整合またはメモリ不足の可能性があります。
              </p>
              
              <div className="bg-slate-50 p-4 rounded-2xl mb-8 overflow-auto max-h-32">
                <pre className="text-[10px] text-slate-500 font-mono">
                  {this.state.error?.message || 'Unknown error'}
                  {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={this.handleReset}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl h-12 font-bold shadow-md"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  アプリを再読み込み
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={this.handleClearCache}
                  className="w-full border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl h-12 font-bold transition-all"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  キャッシュをクリアして修復
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

    return (this as any).props.children;
  }
}
