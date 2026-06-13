"use client";

import * as React from "react";

import type { CursorData, CursorOverlayState } from "@platejs/selection/react";

import { useCursorOverlay } from "@platejs/selection/react";

import { RangeApi } from "platejs";

import { cn } from "@/lib/utils";



const Cursor = ({ caretPosition, data, id, selection, selectionRects }: CursorOverlayState<CursorData>) => {
  const { style, selectionStyle = style } = data ?? ({} as CursorData);
  const isCursor = RangeApi.isCollapsed(selection);
  return selectionRects.map((position, index) => (
    <div
      key={index}
      className={cn(
        "pointer-events-none absolute z-10",
        id === "selection" && "bg-brand/25",
        id === "selection" && isCursor && "bg-primary",
      )}
      style={{
        ...selectionStyle,
        ...position,
      }}
    />
  )).concat(
    caretPosition ? (
      <div
        key="caret"
        className={cn(
          "pointer-events-none absolute z-10 w-0.5",
          id === "drag" && "w-px bg-brand",
        )}
        style={{ ...caretPosition, ...style }}
      />
    ) : [],
  );
};

const CursorOverlay = () => {
  const { cursors } = useCursorOverlay();
  return cursors.map((cursor) => <Cursor key={cursor.id} {...cursor} />);
};



export { CursorOverlay };
