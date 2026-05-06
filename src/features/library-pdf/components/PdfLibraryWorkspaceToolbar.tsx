import type { ComponentType } from "react";

import { Filter, Search } from "@/ui/icons";
import {
  WorkspaceHeaderToolbar,
  type WorkspaceHeaderToolbarIconProps,
} from "@/features/workspace/components/WorkspaceHeaderToolbar";

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
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M1.75 4.25C1.75 3.69772 2.19772 3.25 2.75 3.25H6.81066C7.07587 3.25 7.33023 3.35536 7.51777 3.54289L8.20711 4.23223C8.30088 4.326 8.42809 4.37868 8.56066 4.37868H13.25C13.8023 4.37868 14.25 4.82639 14.25 5.37868V11.25C14.25 11.8023 13.8023 12.25 13.25 12.25H2.75C2.19772 12.25 1.75 11.8023 1.75 11.25V4.25Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  </svg>
);

const PdfTabIcon = ({
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
      d="M4 2.5H8.93934C9.20455 2.5 9.45891 2.60536 9.64645 2.79289L12.2071 5.35355C12.3946 5.54109 12.5 5.79544 12.5 6.06066V13C12.5 13.5523 12.0523 14 11.5 14H4C3.44772 14 3 13.5523 3 13V3.5C3 2.94772 3.44772 2.5 4 2.5Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
    <path
      d="M8.75 2.75V5.25C8.75 5.66421 9.08579 6 9.5 6H12"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FlashcardTabIcon = ({
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
    <rect
      x="2.25"
      y="4"
      width="8.5"
      height="6.5"
      rx="1.25"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <rect
      x="5.25"
      y="5.5"
      width="8.5"
      height="6.5"
      rx="1.25"
      stroke="currentColor"
      strokeWidth="1.25"
    />
  </svg>
);

const NotesTabIcon = ({
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
    <rect
      x="3"
      y="2.5"
      width="10"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M5.5 5.5H10.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <path
      d="M5.5 8H10.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <path
      d="M5.5 10.5H8.75"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

const ThumbnailToolbarIcon = ({
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
    <rect
      x="2.5"
      y="2.5"
      width="11"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M6 2.75V13.25"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <rect
      x="3.4"
      y="4"
      width="1.2"
      height="1.2"
      rx="0.4"
      fill="currentColor"
    />
    <rect
      x="3.4"
      y="6.9"
      width="1.2"
      height="1.2"
      rx="0.4"
      fill="currentColor"
    />
    <rect
      x="3.4"
      y="9.8"
      width="1.2"
      height="1.2"
      rx="0.4"
      fill="currentColor"
    />
    <path
      d="M7.75 5H11.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <path
      d="M7.75 8H11.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <path
      d="M7.75 11H10.25"
      stroke="currentColor"
      strokeWidth="1.25"
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
      fill="#8F929C"
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
      fill="#74798B"
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

const PDF_LIBRARY_LEADING_ACTIONS = [
  {
    label: "Thumbnails",
    ariaLabel: "サムネイル",
    icon: ThumbnailToolbarIcon,
    onClick: () => undefined,
  },
] as const;

const PDF_LIBRARY_ACTIONS = [
  { label: "Search", icon: Search },
  { label: "Filter", icon: Filter },
  { label: "Sort", icon: SortToolbarIcon },
  { label: "Fields", icon: FieldsToolbarIcon },
] as const;

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
      leadingActions={PDF_LIBRARY_LEADING_ACTIONS}
      actions={PDF_LIBRARY_ACTIONS}
    />
  );
};