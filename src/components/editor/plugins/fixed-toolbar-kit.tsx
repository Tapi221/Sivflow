"use client";

import { createPlatePlugin } from "platejs/react";

import { ToolbarNote } from "@/chip/panel/overlay-toolbar/OverlayToolbar.Note";

import { FixedToolbar } from "@/chip/ui/plate/fixed-toolbar";



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
