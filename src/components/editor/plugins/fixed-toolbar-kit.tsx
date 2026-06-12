"use client";

import { createPlatePlugin } from "platejs/react";
import { FixedToolbar } from "@/chip/ui/fixed-toolbar";
import { FixedToolbarButtons } from "@/chip/ui/fixed-toolbar-buttons";

const FixedToolbarKit = [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <FixedToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];

export { FixedToolbarKit };
