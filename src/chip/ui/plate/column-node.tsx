"use client";

import * as React from "react";

import { ResizableProvider } from "@platejs/resizable";

import type { TColumnElement } from "platejs";

import type { PlateElementProps } from "platejs/react";

import { PlateElement, withHOC } from "platejs/react";

import { cn } from "@/lib/utils";

const ColumnElement = withHOC(ResizableProvider, (props: PlateElementProps<TColumnElement>) => {
  const { width } = props.element;
  return (
    <div className="group/column relative" style={{ width: width ?? "100%" }}>
      <PlateElement {...props} className="h-full px-2 pt-2 group-first/column:pl-0 group-last/column:pr-0">
        <div className={cn("relative h-full rounded-lg border border-border border-dashed p-1.5")}>
          {props.children}
        </div>
      </PlateElement>
    </div>
  );
});

const ColumnGroupElement = (props: PlateElementProps) => {
  return (
    <PlateElement className="mb-2" {...props}>
      <div className="flex size-full rounded">{props.children}</div>
    </PlateElement>
  );
};

export { ColumnElement, ColumnGroupElement };
