"use client";

import { CodeDrawingPlugin } from "@platejs/code-drawing/react";

import { CodeDrawingElement } from "@/chip/ui/plate/code-drawing-node";



const CodeDrawingKit = [
  CodeDrawingPlugin.withComponent(CodeDrawingElement),
];



export { CodeDrawingKit };
