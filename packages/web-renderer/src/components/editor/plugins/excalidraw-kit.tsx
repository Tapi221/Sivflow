"use client";

import { ExcalidrawPlugin } from "@platejs/excalidraw/react";
import { ExcalidrawElement } from "@web-renderer/chip/ui/plate/excalidraw-node";

const ExcalidrawKit = [
  ExcalidrawPlugin.withComponent(ExcalidrawElement),
];

export { ExcalidrawKit };
