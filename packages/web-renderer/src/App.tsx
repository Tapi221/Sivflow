import { AppContent } from "@web-renderer/app/AppContent";
import { AppProviders } from "@web-renderer/app/AppProviders";

const App = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
};

export { App };
