import { BaseCodeDrawingPlugin } from "@platejs/code-drawing";
import { CodeDrawingElement } from "@/chip/ui/plate/code-drawing-node";



const BaseCodeDrawingKit = [
  BaseCodeDrawingPlugin.configure({
    node: { component: CodeDrawingElement },
  }),
];



export { BaseCodeDrawingKit };
