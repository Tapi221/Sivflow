"use client";

import { createPlatePlugin } from "platejs/react";
import { FixedToolbarButtons } from "@/chip/ui/button/fixed-toolbar-buttons";
import { FixedToolbar } from "@/chip/ui/toolbar/fixed-toolbar";

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
