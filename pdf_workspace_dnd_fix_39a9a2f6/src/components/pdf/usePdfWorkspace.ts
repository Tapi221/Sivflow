import { useContext } from "react";

import {
  PdfWorkspaceContext,
  type PdfWorkspaceContextValue,
} from "@/components/pdf/PdfWorkspaceProvider";

export const usePdfWorkspace = (): PdfWorkspaceContextValue => {
  const context = useContext(PdfWorkspaceContext);

  if (!context) {
    throw new Error("usePdfWorkspace must be used within PdfWorkspaceProvider");
  }

  return context;
};
