import { AppContent } from "@web-renderer/app/AppContent";
import type { AppContentProps } from "@web-renderer/app/AppContent";

type AppProps = AppContentProps;

const App = (props: AppProps) => {
  return <AppContent {...props} />;
};

export { App };
export type { AppProps };
