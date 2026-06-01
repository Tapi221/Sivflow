import { Toaster } from "sonner";

const AppSonnerToaster = () => <Toaster closeButton richColors position="bottom-right" visibleToasts={3} offset={{ bottom: 24, right: 24 }} toastOptions={{ duration: 5000 }} />;

export { AppSonnerToaster };
