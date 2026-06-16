"use client";

import { ToolbarNote } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbar.Note";
import { FixedToolbar } from "@web-renderer/chip/ui/plate/fixed-toolbar";
import { createPlatePlugin } from "platejs/react";

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
