"use client";

import * as React from "react";
import { BoldIcon } from "lucide-react";
import { KEYS } from "platejs";
import { MarkToolbarButton } from "@/chip/ui/button/mark-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";

const FixedToolbarButtons = () => {
  return (
    <div className="flex w-full">
      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold">
          <BoldIcon />
        </MarkToolbarButton>
      </ToolbarGroup>
      <div className="grow" />
    </div>
  );
};

export { FixedToolbarButtons };
