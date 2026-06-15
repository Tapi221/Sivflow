"use client";

import { CursorOverlayPlugin } from "@platejs/selection/react";
import { CursorOverlay } from "@/chip/ui/plate/cursor-overlay";

const renderAfterEditable = () => <CursorOverlay />;

const CursorOverlayKit = [
  CursorOverlayPlugin.configure({
    render: {
      afterEditable: renderAfterEditable,
    },
  }),
];

export { CursorOverlayKit };
