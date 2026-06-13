"use client";

import * as React from "react";

import { useIndentButton, useOutdentButton } from "@platejs/indent/react";

import { IndentIcon, OutdentIcon } from "lucide-react";

import { ToolbarButton } from "@/chip/ui/toolbar";



const IndentToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const { props: buttonProps } = useIndentButton();

  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Indent">
      <IndentIcon />
    </ToolbarButton>
  );
};

const OutdentToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const { props: buttonProps } = useOutdentButton();

  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Outdent">
      <OutdentIcon />
    </ToolbarButton>
  );
};



export { IndentToolbarButton, OutdentToolbarButton };
