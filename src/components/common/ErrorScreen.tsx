import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export const ErrorScreen = () => {
  return <>error</>;
};

/**
 * 致命的なクラッシュをキャッチし、開発用の最小限のエラー表示を行うコンポーネント
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

  public render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }

    return this.props.children;
  }
}
