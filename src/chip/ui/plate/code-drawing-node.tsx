"use client";

import * as React from "react";
import type { TCodeDrawingElement } from "@platejs/code-drawing";
import { DEFAULT_MIN_HEIGHT } from "@platejs/code-drawing";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

const CodeDrawingElement = (props: PlateElementProps<TCodeDrawingElement>) => {
  const code = props.element.data?.code ?? "";
  return (
    <PlateElement {...props} className="my-2">
      <div className="relative rounded-md border bg-muted/30" style={{ minHeight: DEFAULT_MIN_HEIGHT }} contentEditable={false}>
        <pre className="m-0 overflow-auto p-4 text-xs">{code}</pre>
      </div>
      {props.children}
    </PlateElement>
  );
};

export { CodeDrawingElement };
