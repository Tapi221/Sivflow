"use client";

import { createPlatePlugin } from "platejs/react";
import { FloatingToolbarButtons } from "@/chip/ui/button/floating-toolbar-buttons";
import { FloatingToolbar } from "@/chip/ui/toolbar/floating-toolbar";

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
