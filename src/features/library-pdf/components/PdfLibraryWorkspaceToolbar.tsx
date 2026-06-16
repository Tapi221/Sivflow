import type { IconProps } from "@web-renderer/chip/icons";
import { FlashCardIcon, PDFIcon } from "@web-renderer/chip/icons/icons.library";
import { HoverTooltip } from "@web-renderer/chip/panel/toolchip/HoverTooltip";
import { cn } from "@web-renderer/lib/utils";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";



type PdfLibraryWorkspaceSection = "flashcard" | "pdf";
type PdfLibraryWorkspaceToolbarProps = {
  activeSection: PdfLibraryWorkspaceSection;
  onSelectSection?: (section: PdfLibraryWorkspaceSection) => void;
  onAddPdf?: () => void;
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



const resolveLibrarySectionRoute = (section: PdfLibraryWorkspaceSection): string => {
  return section === "flashcard" ? "/library/flashcard" : "/library/pdf";
};



const PdfLibraryWorkspaceToolbar = ({ activeSection, onSelectSection, onAddPdf }: PdfLibraryWorkspaceToolbarProps) => {
  const navigate = useNavigate();
  const shouldRenderAddPdf = activeSection === "pdf" && onAddPdf !== undefined;

  const handleSelectSection = (section: PdfLibraryWorkspaceSection) => {
    onSelectSection?.(section);
    navigate(resolveLibrarySectionRoute(section));
  };

  return (
    <>
      <style>{".section-list-blank-pane .library-workspace-toolbar{display:none}"}</style>
      <div className="library-workspace-toolbar flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pr-[var(--workspace-content-gutter)]">
        <div className="flex items-center gap-3">
          <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-zinc-100 p-0.5">
            {LIBRARY_TYPE_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.value;
              const isStartEdgeTab = index === 0;

              return (
                <HoverTooltip key={tab.value} label={tab.label} side="top" align={isStartEdgeTab ? "start" : "center"} offset={6} preset="segmented">
                  <button type="button" onClick={() => handleSelectSection(tab.value)} aria-label={tab.label} aria-pressed={isActive} className={cn("relative z-10 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg p-0", "appearance-none select-none", "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none", "focus:outline-none focus:ring-0 focus-visible:outline-none", isActive ? "text-[#8c8c8c]" : "text-[#b3b3b3] hover:text-[#8c8c8c]")}>
                    {isActive && <motion.span layoutId={TAB_INDICATOR_ID} className="absolute inset-0 -z-10 rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]" transition={TAB_MOTION_TRANSITION} />}
                    <Icon aria-hidden="true" className={cn("block h-4 w-4 shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none", isActive ? "text-[#8c8c8c]" : "text-[#b7b7b7]")} />
                  </button>
                </HoverTooltip>
              );
            })}
          </div>
        </div>
        {shouldRenderAddPdf && (
          <HoverTooltip label="PDFを追加" side="top" align="end" offset={6} preset="segmented">
            <button type="button" onClick={onAddPdf} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-3 text-xs font-medium text-[#707070] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-zinc-100" aria-label="PDFを追加">
              <PDFIcon aria-hidden="true" className="block h-4 w-4 text-[#b7b7b7]" />
              <span>PDF追加</span>
            </button>
          </HoverTooltip>
        )}
      </div>
    </>
  );
};



export { PdfLibraryWorkspaceToolbar };


export type { PdfLibraryWorkspaceSection };
