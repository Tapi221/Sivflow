"use client";

import "@excalidraw/excalidraw/index.css";

import type { TExcalidrawElement } from "@platejs/excalidraw";

import { useExcalidrawElement } from "@platejs/excalidraw/react";

import { cn } from "@web-renderer/lib/utils";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";



const ExcalidrawElement = ({ children, className, element, ...props }: PlateElementProps<TExcalidrawElement>) => {
  const { Excalidraw, excalidrawProps } = useExcalidrawElement({ element });
  return (
    <PlateElement {...props} element={element} className={cn("my-4 overflow-hidden rounded-lg border bg-background", className)}>
      <div contentEditable={false} className="h-96 min-h-80 w-full overflow-hidden">
        {Excalidraw ? <Excalidraw {...excalidrawProps} /> : <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Loading Excalidraw...</div>}
      </div>
      {children}
    </PlateElement>
  );
};



export { ExcalidrawElement };
