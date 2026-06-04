import { type CSSProperties } from "react";
import { PdfLibraryWorkspaceToolbar } from "@/features/library-pdf/components/PdfLibraryWorkspaceToolbar";
import { cn } from "@/lib/utils";

type WorkspaceActionToolbarProps = {
  className?: string;
  style?: CSSProperties;
};

const WorkspaceActionToolbar = ({ className, style }: WorkspaceActionToolbarProps) => {
  return (
    <div className={cn("flex items-center", className)} style={style}>
      <PdfLibraryWorkspaceToolbar activeSection="flashcard" />
    </div>
  );
};

export { WorkspaceActionToolbar };
