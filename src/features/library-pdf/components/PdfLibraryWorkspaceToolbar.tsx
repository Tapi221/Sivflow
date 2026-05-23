import type { ComponentType } from "react";

import {
  WorkspaceHeaderToolbar,
  type WorkspaceHeaderToolbarIconProps,
} from "@/features/workspace/WorkspaceHeaderToolbar";

type PdfLibraryWorkspaceSection = "explorer" | "pdf" | "flashcard" | "notes";

type PdfLibraryWorkspaceToolbarProps = {
  activeSection: PdfLibraryWorkspaceSection;
  onSelectSection: (section: PdfLibraryWorkspaceSection) => void;
};

const ExplorerTabIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M2.75 5.25C2.75 4.42157 3.42157 3.75 4.25 3.75H7.18C7.53503 3.75 7.87552 3.89104 8.12656 4.14208L8.60792 4.62344C8.85896 4.87448 9.19945 5.01552 9.55448 5.01552H13.75C14.5784 5.01552 15.25 5.68709 15.25 6.51552V12.25C15.25 13.0784 14.5784 13.75 13.75 13.75H4.25C3.42157 13.75 2.75 13.0784 2.75 12.25V5.25Z"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.25 7.25H14.75"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

const PdfTabIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M5.25 2.75H9.1875L12.75 6.3125V13.25C12.75 14.0784 12.0784 14.75 11.25 14.75H5.25C4.42157 14.75 3.75 14.0784 3.75 13.25V4.25C3.75 3.42157 4.42157 2.75 5.25 2.75Z"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.25 2.875V5.25C9.25 5.94036 9.80964 6.5 10.5 6.5H12.625"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.95 9.2H10.55M5.95 11.45H9.25"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

const FlashcardTabIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="3.2"
      y="4.3"
      width="9.25"
      height="6.55"
      rx="1.65"
      stroke="currentColor"
      strokeWidth="1.45"
    />
    <path
      d="M5.55 12.2C5.81676 13.0751 6.6302 13.7125 7.5924 13.7125H11.8924C13.095 13.7125 14.07 12.7375 14.07 11.535V8.435C14.07 7.48669 13.4639 6.68008 12.6178 6.38164"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
    <path
      d="M5.8 7.6H9.8"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

const NotesTabIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M5.25 2.75H12.75C13.5784 2.75 14.25 3.42157 14.25 4.25V13.75C14.25 14.5784 13.5784 15.25 12.75 15.25H5.25C4.42157 15.25 3.75 14.5784 3.75 13.75V4.25C3.75 3.42157 4.42157 2.75 5.25 2.75Z"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.4 6.25H11.6M6.4 9H11.6M6.4 11.75H9.8"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

const PDF_LIBRARY_TABS = [
  { value: "explorer", label: "Explorer", icon: ExplorerTabIcon },
  { value: "pdf", label: "PDF", icon: PdfTabIcon },
  { value: "flashcard", label: "Flashcard", icon: FlashcardTabIcon },
  { value: "notes", label: "Notes", icon: NotesTabIcon },
] as const satisfies ReadonlyArray<{
  value: PdfLibraryWorkspaceSection;
  label: string;
  icon: ComponentType<WorkspaceHeaderToolbarIconProps>;
}>;

export const PdfLibraryWorkspaceToolbar = ({
  activeSection,
  onSelectSection,
}: PdfLibraryWorkspaceToolbarProps) => {
  return (
    <WorkspaceHeaderToolbar
      activeValue={activeSection}
      tabs={PDF_LIBRARY_TABS.map((tab) => ({
        ...tab,
        onClick: () => onSelectSection(tab.value),
      }))}
      variant="segmented"
    />
  );
};
