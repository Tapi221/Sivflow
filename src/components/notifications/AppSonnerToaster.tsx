import { Toaster } from "sonner";

const AppSonnerToaster = () => <Toaster closeButton richColors position="bottom-center" visibleToasts={3} offset={{ bottom: 24, left: 16, right: 16 }} toastOptions={{ duration: 5000 }} />;

export { AppSonnerToaster };
