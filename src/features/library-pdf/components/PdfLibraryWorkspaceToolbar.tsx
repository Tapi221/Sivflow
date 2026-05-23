import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";

import {
  WorkspaceHeaderToolbar,
  type WorkspaceHeaderToolbarIconProps,
} from "@/features/workspace/WorkspaceHeaderToolbar";

import { Filter, Search } from "@/ui/icons";

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

const SortToolbarIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9337 5.49595L8.00095 2.125L4.06817 5.49595C3.78932 5.73497 3.75703 6.15478 3.99604 6.43363C4.23506 6.71248 4.65487 6.74478 4.93373 6.50576L8.00095 3.87671L11.0682 6.50576C11.347 6.74478 11.7668 6.71248 12.0059 6.43363C12.2449 6.15478 12.2126 5.73497 11.9337 5.49595ZM4.06823 10.506L8.001 13.877L11.9338 10.506C12.2126 10.267 12.2449 9.84717 12.0059 9.56832C11.7669 9.28947 11.3471 9.25717 11.0682 9.49619L8.001 12.1252L4.93378 9.49619C4.65493 9.25717 4.23511 9.28947 3.9961 9.56832C3.75708 9.84717 3.78938 10.267 4.06823 10.506Z"
      fill="currentColor"
    />
  </svg>
);

const FieldsToolbarIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.00094 3.33594C1.63367 3.33594 1.33594 3.63367 1.33594 4.00094C1.33594 4.36821 1.63367 4.66594 2.00094 4.66594H2.0076C2.37487 4.66594 2.6726 4.36821 2.6726 4.00094C2.6726 3.63367 2.37487 3.33594 2.0076 3.33594H2.00094ZM5.33443 3.33594C4.96716 3.33594 4.66943 3.63367 4.66943 4.00094C4.66943 4.36821 4.96716 4.66594 5.33443 4.66594H14.0011C14.3684 4.66594 14.6661 4.36821 14.6661 4.00094C14.6661 3.63367 14.3684 3.33594 14.0011 3.33594H5.33443ZM5.33443 7.33594C4.96716 7.33594 4.66943 7.63367 4.66943 8.00094C4.66943 8.36821 4.96716 8.66594 5.33443 8.66594H14.0011C14.3684 8.66594 14.6661 8.36821 14.6661 8.00094C14.6661 7.63367 14.3684 7.33594 14.0011 7.33594H5.33443ZM4.66943 12.0009C4.66943 11.6337 4.96716 11.3359 5.33443 11.3359H14.0011C14.3684 11.3359 14.6661 11.6337 14.6661 12.0009C14.6661 12.3682 14.3684 12.6659 14.0011 12.6659H5.33443C4.96716 12.6659 4.66943 12.3682 4.66943 12.0009ZM1.33594 8.00094C1.33594 7.63367 1.63367 7.33594 2.00094 7.33594H2.0076C2.37487 7.33594 2.6726 7.63367 2.6726 8.00094C2.6726 8.36821 2.37487 8.66594 2.0076 8.66594H2.00094C1.63367 8.66594 1.33594 8.36821 1.33594 8.00094ZM2.00094 11.3359C1.63367 11.3359 1.33594 11.6337 1.33594 12.0009C1.33594 12.3682 1.63367 12.6659 2.00094 12.6659H2.0076C2.37487 12.6659 2.6726 12.3682 2.6726 12.0009C2.6726 11.6337 2.37487 11.3359 2.0076 11.3359H2.00094Z"
      fill="currentColor"
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

const PDF_LIBRARY_ACTIONS = [
  { label: "Search", icon: Search },
  { label: "Filter", icon: Filter },
  { label: "Sort", icon: SortToolbarIcon },
  { label: "Fields", icon: FieldsToolbarIcon },
] as const;

const resolveLibrarySectionRoute = (
  section: PdfLibraryWorkspaceSection,
): string => {
  if (section === "explorer") {
    return "/folders?view=section-list";
  }

  const libraryType = section === "flashcard" ? "flashcards" : section;
  return `/folders?view=section-list&libraryType=${libraryType}`;
};

export const PdfLibraryWorkspaceToolbar = ({
  activeSection,
  onSelectSection,
}: PdfLibraryWorkspaceToolbarProps) => {
  const navigate = useNavigate();

  const handleSelectSection = (section: PdfLibraryWorkspaceSection) => {
    onSelectSection(section);
    navigate(resolveLibrarySectionRoute(section));
  };

  return (
    <WorkspaceHeaderToolbar
      activeValue={activeSection}
      tabs={PDF_LIBRARY_TABS.map((tab) => ({
        ...tab,
        onClick: () => handleSelectSection(tab.value),
      }))}
      actions={PDF_LIBRARY_ACTIONS}
      variant="segmented"
    />
  );
};
