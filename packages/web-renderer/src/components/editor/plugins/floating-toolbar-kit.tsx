"use client";

import { FloatingToolbarButtons } from "@web-renderer/chip/panel/overlay-toolbar/Toolbar.Note.Floating";

import { FloatingToolbar } from "@web-renderer/chip/ui/plate/floating-toolbar";

import { createPlatePlugin } from "platejs/react";



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
