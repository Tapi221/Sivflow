import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type PdfLibraryWorkspaceSection = "explorer" | "pdf" | "flashcard" | "notes";

type PdfLibraryWorkspaceToolbarProps = {
  activeSection: PdfLibraryWorkspaceSection;
  onSelectSection: (section: PdfLibraryWorkspaceSection) => void;
};

type ToolbarIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

const ExplorerTabIcon = ({ className, ...props }: ToolbarIconProps) => (
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
      d="M2.25 3.25C1.83579 3.25 1.5 3.58579 1.5 4V11.9999C1.5 12.4142 1.83579 12.75 2.25 12.75H13.75C14.1642 12.75 14.5 12.4142 14.5 11.9999V5.5C14.5 5.08579 14.1642 4.75 13.75 4.75H8.68566C8.48675 4.75 8.29598 4.67098 8.15533 4.53033L7.46967 3.84467C7.32902 3.70402 7.13825 3.625 6.93934 3.625H2.25ZM0.5 4C0.5 3.0335 1.2835 2.25 2.25 2.25H6.93934C7.40344 2.25 7.84859 2.43437 8.17678 2.76256L8.86244 3.44822C8.81556 3.40134 8.87915 3.375 8.68566 3.375H13.75C14.7165 3.375 15.5 4.1585 15.5 5.125V11.9999C15.5 12.9665 14.7165 13.75 13.75 13.75H2.25C1.2835 13.75 0.5 12.9665 0.5 11.9999V4Z"
      fill="currentColor"
    />
  </svg>
);

const PdfTabIcon = ({ className, ...props }: ToolbarIconProps) => (
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
      d="M4.25 1.5C3.42157 1.5 2.75 2.17157 2.75 3V13C2.75 13.8284 3.42157 14.5 4.25 14.5H11.75C12.5784 14.5 13.25 13.8284 13.25 13V5.56066C13.25 5.16283 13.0919 4.7813 12.8107 4.5L10.25 1.93934C9.9687 1.65804 9.58717 1.5 9.18934 1.5H4.25ZM4.25 2.5C3.97386 2.5 3.75 2.72386 3.75 3V13C3.75 13.2761 3.97386 13.5 4.25 13.5H11.75C12.0261 13.5 12.25 13.2761 12.25 13V5.56066C12.25 5.42798 12.1973 5.30087 12.1036 5.20711L9.54289 2.64645C9.44913 2.55268 9.32202 2.5 9.18934 2.5H4.25Z"
      fill="currentColor"
    />
    <path
      d="M5.25 10.55V6.95H6.71C7.0104 6.95 7.25547 7.01867 7.4452 7.156C7.63747 7.2908 7.7336 7.50133 7.7336 7.7876C7.7336 8.07387 7.63747 8.28693 7.4452 8.4268C7.25547 8.56413 7.0104 8.6328 6.71 8.6328H5.95V10.55H5.25ZM5.95 8.0692H6.5988C6.7612 8.0692 6.88587 8.04127 6.9728 7.9854C7.05973 7.927 7.1032 7.82707 7.1032 7.6856C7.1032 7.54413 7.05973 7.44547 6.9728 7.3896C6.88587 7.3312 6.7612 7.302 6.5988 7.302H5.95V8.0692Z"
      fill="currentColor"
    />
    <path
      d="M8.32949 10.55V6.95H9.61749C10.0084 6.95 10.3142 7.05067 10.5349 7.252C10.7582 7.45333 10.8699 7.74213 10.8699 8.1184V9.3816C10.8699 9.75787 10.7582 10.0467 10.5349 10.248C10.3142 10.4493 10.0084 10.55 9.61749 10.55H8.32949ZM9.02949 9.9864H9.56169C9.76289 9.9864 9.91769 9.9356 10.0261 9.834C10.137 9.72987 10.1925 9.5776 10.1925 9.3772V8.1228C10.1925 7.9224 10.137 7.7714 10.0261 7.6698C9.91769 7.56567 9.76289 7.5136 9.56169 7.5136H9.02949V9.9864Z"
      fill="currentColor"
    />
  </svg>
);

const FlashcardTabIcon = ({ className, ...props }: ToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="2.5" y="4" width="9.5" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
    <rect x="5" y="6" width="8.5" height="7" rx="1.25" fill="white" stroke="currentColor" strokeWidth="1.25" />
    <path d="M7 8.5H11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M7 10.5H10.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

const NotesTabIcon = ({ className, ...props }: ToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="3" y="2.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
    <path d="M5.25 5.5H10.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M5.25 8H10.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M5.25 10.5H8.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

const SearchActionIcon = ({ className, ...props }: ToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FilterActionIcon = ({ className, ...props }: ToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M2.5 4H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.5 8H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6.5 12H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SortActionIcon = ({ className, ...props }: ToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M5 3L2.75 5.25L5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 8.5L13.25 10.75L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5.25H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5.5 10.75H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FieldsActionIcon = ({ className, ...props }: ToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M2.5 3.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2.5 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2.5 12.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="4.25" cy="3.5" r="1" fill="currentColor" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
    <circle cx="11.75" cy="12.5" r="1" fill="currentColor" />
  </svg>
);

const PDF_LIBRARY_TABS = [
  { value: "explorer", label: "Explorer", icon: ExplorerTabIcon },
  { value: "pdf", label: "PDF", icon: PdfTabIcon },
  { value: "flashcard", label: "Flashcard", icon: FlashcardTabIcon },
  { value: "notes", label: "Notes", icon: NotesTabIcon },
] as const;

const PDF_LIBRARY_ACTIONS = [
  { label: "Search", icon: SearchActionIcon },
  { label: "Filter", icon: FilterActionIcon },
  { label: "Sort", icon: SortActionIcon },
  { label: "Fields", icon: FieldsActionIcon },
] as const;

export const PdfLibraryWorkspaceToolbar = ({
  activeSection,
  onSelectSection,
}: PdfLibraryWorkspaceToolbarProps) => {
  return (
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 flex-wrap items-center justify-between overflow-hidden bg-white after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">
      <div className="flex h-7 shrink-0 items-start gap-[6px]">
        {PDF_LIBRARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.value;

          return (
            <div key={tab.value} className="flex flex-col items-start pb-2">
              <button
                type="button"
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded py-[3px] pl-0 pr-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "text-[#25272d]" : "text-[#8f929c]",
                )}
                aria-pressed={isActive}
                onClick={() => onSelectSection(tab.value)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "flex h-7 items-center whitespace-nowrap",
                    isActive && "border-b-2 border-[#74798b]",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-end gap-[6px]">
        {PDF_LIBRARY_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          const isLast = index === PDF_LIBRARY_ACTIONS.length - 1;

          return (
            <button
              key={action.label}
              type="button"
              className={cn(
                "flex h-7 items-center gap-[6px] rounded py-[3px] pl-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isLast ? "pr-0" : "pr-2",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
