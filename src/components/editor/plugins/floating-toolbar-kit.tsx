"use client";

import { createPlatePlugin } from "platejs/react";
import { FloatingToolbar } from "@/chip/ui/plate/floating-toolbar";
import { FloatingToolbarButtons } from "@/chip/panel/overlay-toolbar/Toolbar.Note.Floating";

const FloatingToolbarKit = [
  createPlatePlugin({
    key: "floating-toolbar",
    render: {
      afterEditable: () => (
        <FloatingToolbar>
          <FloatingToolbarButtons />
        </FloatingToolbar>
      ),
    },
  }),
];

export { FloatingToolbarKit };
