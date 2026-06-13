"use client";

import { createPlatePlugin } from "platejs/react";
import { FloatingToolbar } from "@/chip/ui/plate/floating-toolbar";
import { FloatingToolbarButtons } from "@/chip/ui/plate/floating-toolbar-buttons";

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
