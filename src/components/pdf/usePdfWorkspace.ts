import { PdfWorkspaceContext } from "@/components/pdf/PdfWorkspaceProvider";
import { useContext } from "react";

export const usePdfWorkspace = () => {
  const contextValue = useContext(PdfWorkspaceContext);

  if (!contextValue) {
    throw new Error("usePdfWorkspace must be used within PdfWorkspaceProvider");
  }

  return contextValue;
};
