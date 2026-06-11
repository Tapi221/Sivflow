import { Toaster } from "sonner";



const AppSonnerToaster = () => <Toaster position="bottom-right" toastOptions={{ classNames: { toast: "!rounded-[7px] !border-0 !bg-[var(--ds-semantic-color-background-sidebar)] !text-[#85827e] !shadow-sm", title: "text-[#111111]", description: "text-[#85827e]", actionButton: "!bg-transparent !text-[#111111]" } }} />;



export { AppSonnerToaster 