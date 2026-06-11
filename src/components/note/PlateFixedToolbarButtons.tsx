import { BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";

import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarGroup } from "@/components/ui/toolbar";

const PlateFixedToolbarButtons = () => {
  const readOnly = useEditorReadOnly();

  return (
    <div className="flex w-full">
      {!readOnly && (
        <ToolbarGroup>
          <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
            <BoldIcon />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
            <ItalicIcon />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={KEYS.underline} tooltip="Underline (⌘+U)">
            <UnderlineIcon />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={KEYS.strikethrough} tooltip="Strikethrough (⌘+⇧+M)">
            <StrikethroughIcon />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
            <Code2Icon />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
            <HighlighterIcon />
          </MarkToolbarButton>
        </ToolbarGroup>
      )}
    </div>
  );
};

PlateFixedToolbarButtons.displayName = "PlateFixedToolbarButtons";

export { PlateFixedToolbarButtons };
