"use client";

import { createPlatePlugin } from "platejs/react";
import { FixedToolbar } from "@/chip/ui/toolbar/fixed-toolbar";
import { FixedToolbarButtons } from "@/chip/ui/button/fixed-toolbar-buttons";

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
