"use client";

import * as React from "react";
import { useToggleToolbarButton, useToggleToolbarButtonState } from "@platejs/toggle/react";
import { ToolbarButton } from "@web-renderer/chip/ui/plate/toolbar";
import { ListCollapseIcon } from "lucide-react";

const ButtonNoteToggle = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const state = useToggleToolbarButtonState();
  const { props: buttonProps } = useToggleToolbarButton(state);
  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Toggle">
      <ListCollapseIcon />
    </ToolbarButton>
  );
};

export { ButtonNoteToggle };
