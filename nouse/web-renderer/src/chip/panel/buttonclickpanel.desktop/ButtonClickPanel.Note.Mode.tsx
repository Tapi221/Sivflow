"use client";

import { useState } from "react";

import { SuggestionPlugin } from "@platejs/suggestion/react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@web-renderer/chip/panel/dropdown-menu";

import { ToolbarButton } from "@web-renderer/chip/ui/plate/toolbar";

import { EyeIcon, PencilLineIcon, PenIcon } from "lucide-react";

import { useEditorReadOnly, useEditorRef, usePluginOption } from "platejs/react";

import type { ReactNode } from "react";



type ModeValue = "editing" | "suggestion" | "viewing";

type ModeItem = {
  icon: ReactNode;
  label: string;
};



const modeItems: Record<ModeValue, ModeItem> = {
  editing: { icon: <PenIcon />, label: "Editing" },
  suggestion: { icon: <PencilLineIcon />, label: "Suggestion" },
  viewing: { icon: <EyeIcon />, label: "Viewing" },
};



const getModeValue = (readOnly: boolean, isSuggesting: boolean): ModeValue => {
  if (readOnly) return "viewing";
  if (isSuggesting) return "suggestion";
  return "editing";
};



const ButtonClickPanelNoteMode = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const readOnly = useEditorReadOnly();
  const [open, setOpen] = useState(false);
  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");
  const value = getModeValue(readOnly, isSuggesting);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Editing mode" isDropdown>
          {modeItems[value].icon}
          <span className="hidden lg:inline">{modeItems[value].label}</span>
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup
          onValueChange={(newValue) => {
            if (newValue === "viewing") {
              editor.store.setReadOnly(true);
              return;
            }
            editor.store.setReadOnly(false);
            if (newValue === "suggestion") {
              editor.setOption(SuggestionPlugin, "isSuggesting", true);
              return;
            }
            editor.setOption(SuggestionPlugin, "isSuggesting", false);
            if (newValue === "editing") {
              editor.tf.focus();
            }
          }}
          value={value}
        >
          <DropdownMenuRadioItem value="editing">
            {modeItems.editing.icon}
            {modeItems.editing.label}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="viewing">
            {modeItems.viewing.icon}
            {modeItems.viewing.label}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="suggestion">
            {modeItems.suggestion.icon}
            {modeItems.suggestion.label}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



export { ButtonClickPanelNoteMode };
