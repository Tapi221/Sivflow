import { Toaster } from "sonner";



const AppSonnerToaster = () => <Toaster position="bottom-right" toastOptions={{ classNames: { toast: "!rounded-md !border-0 !bg-[var(--ds-semantic-color-background-sidebar)] !text-[#85827e] !shadow-sm", title: "text-neutral-950", description: "text-[#85827e]", actionButton: "!bg-transparent !text-neutral-950" } }} />;



export { AppSonnerToaster };
