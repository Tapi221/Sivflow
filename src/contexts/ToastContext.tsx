import type { Toast } from "@web-renderer/contexts/ToastContext";
import * as RendererToastContext from "@web-renderer/contexts/ToastContext";



const ToastProvider = RendererToastContext.ToastProvider;
const useToast = RendererToastContext.useToast;



export { ToastProvider, useToast };


export type { Toast };
