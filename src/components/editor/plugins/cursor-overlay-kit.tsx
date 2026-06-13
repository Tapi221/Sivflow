"use client";

import { CursorOverlayPlugin } from "@platejs/selection/react";

import { CursorOverlay } from "@/chip/ui/cursor-overlay";



const CursorOverlayKit = [CursorOverlayPlugin.configure({ render: { afterEditable: () => <CursorOverlay /> } })];



export { CursorOverlayKit };
