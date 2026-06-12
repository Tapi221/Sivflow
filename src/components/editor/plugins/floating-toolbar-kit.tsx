"use client";

import { createPlatePlugin } from "platejs/react";
import { FloatingToolbar } from "@/chip/ui/toolbar/floating-toolbar";
import { FloatingToolbarButtons } from "@/chip/ui/button/floating-toolbar-buttons";

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