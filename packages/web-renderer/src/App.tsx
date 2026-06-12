import { AppContent } from "@web-renderer/app/AppContent";
import { AppProviders } from "@web-renderer/app/AppProviders";

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;