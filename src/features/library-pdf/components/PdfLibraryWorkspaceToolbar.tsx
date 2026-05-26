import { type ComponentType } from "react";
import { motion, type Transition } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FlashCardIcon, PDFIcon } from "@/chip/icons/icons.library";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { cn } from "@/lib/utils";
import type { IconProps } from "@/ui/icons";

export type PdfLibraryWorkspaceSection = "flashcard" | "pdf";

type PdfLibraryWorkspaceToolbarProps = {
  activeSection: PdfLibraryWorkspaceSection;
  onSelectSection?: (section: PdfLibraryWorkspaceSection) => void;
};

type LibraryTypeToolbarTab = {
  value: PdfLibraryWorkspaceSection;
  label: string;
  icon: ComponentType<IconProps>;
};

const LIBRARY_TYPE_TABS = [
  { value: "flashcard", label: "Flashcard", icon: FlashCardIcon },
  { value: "pdf", label: "PDF", icon: PDFIcon },
] as const satisfies readonly LibraryTypeToolbarTab[];

const TAB_INDICATOR_ID = "library-type-tab-indicator";
const TAB_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const resolveLibrarySectionRoute = (
  section: PdfLibraryWorkspaceSection,
): string => (section === "flashcard" ? "/library/flashcard" : "/library/pdf");

export const PdfLibraryWorkspaceToolbar = ({
  activeSection,
  onSelectSection,
}: PdfLibraryWorkspaceToolbarProps) => {
  const navigate = useNavigate();

  const handleSelectSection = (section: PdfLibraryWorkspaceSection) => {
    onSelectSection?.(section);
    navigate(resolveLibrarySectionRoute(section));
  };

  return (
    <>
      <style>{".section-list-blank-pane .library-workspace-toolbar{display:none}"}</style>
      <div className="library-workspace-toolbar flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pr-[var(--workspace-content-gutter)]">
        <div className="flex items-center gap-3">
          <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f7f7f7] p-0.5">
            {LIBRARY_TYPE_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.value;
              const isStartEdgeTab = index === 0;

              return (
                <HoverTooltip
                  key={tab.value}
                  label={tab.label}
                  side="top"
                  align={isStartEdgeTab ? "start" : "center"}
                  offset={6}
                  preset="segmented"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSection(tab.value)}
                    aria-label={tab.label}
                    aria-pressed={isActive}
                    className={cn(
                      "relative z-10 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg p-0",
                      "appearance-none select-none",
                      "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                      "focus:outline-none focus:ring-0 focus-visible:outline-none",
                      isActive
                        ? "text-[#8c8c8c]"
                        : "text-[#b3b3b3] hover:text-[#8c8c8c]",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={TAB_INDICATOR_ID}
                        className="absolute inset-0 -z-10 rounded-lg border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        transition={TAB_MOTION_TRANSITION}
                      />
                    )}

                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "block h-4 w-4 shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                        isActive ? "text-[#8c8c8c]" : "text-[#b7b7b7]",
                      )}
                    />
                  </button>
                </HoverTooltip>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
