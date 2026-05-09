import {
  PdfWorkspaceContext,
  PdfWorkspaceDocumentContext,
  PdfWorkspaceNavigationContext,
} from "@/features/pdf/PdfWorkspaceContexts";
import { useContext } from "react";

export const usePdfWorkspace = () => {
  const contextValue = useContext(PdfWorkspaceContext);

  if (!contextValue) {
    throw new Error("usePdfWorkspace must be used within PdfWorkspaceProvider");
  }

  return contextValue;
};

export const usePdfWorkspaceDocument = () => {
  const contextValue = useContext(PdfWorkspaceDocumentContext);

  if (!contextValue) {
    throw new Error(
      "usePdfWorkspaceDocument must be used within PdfWorkspaceProvider",
    );
  }

  return contextValue;
};

export const usePdfWorkspaceNavigation = () => {
  const contextValue = useContext(PdfWorkspaceNavigationContext);

  if (!contextValue) {
    throw new Error(
      "usePdfWorkspaceNavigation must be used within PdfWorkspaceProvider",
    );
  }

  return contextValue;
};
