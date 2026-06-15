"use client";

import { createPlatePlugin } from "platejs/react";
import { FixedToolbar } from "@/chip/ui/plate/fixed-toolbar";
import { ToolbarNote } from "@/chip/panel/overlay-toolbar/OverlayToolbar.Note";

const FixedToolbarKit = [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <ToolbarNote />
        </FixedToolbar>
      ),
    },
  }),
];

export { FixedToolbarKit };
