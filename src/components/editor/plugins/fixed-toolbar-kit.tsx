"use client";

import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "@/components/ui/fixed-toolbar";

import { FixedToolbarButtons } from "@/components/ui/fixed-toolbar-buttons";



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
