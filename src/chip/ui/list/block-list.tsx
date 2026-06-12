"use client";

import React from "react";
import { isOrderedList } from "@platejs/list";
import { useTodoListElement, useTodoListElementState } from "@platejs/list/react";
import type { TListElement } from "platejs";
import type { PlateElementProps, RenderNodeWrapper } from "platejs/react";
import { useReadOnly } from "platejs/react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./checkbox";

function TodoMarker(props: PlateElementProps) {
  const state = useTodoListElementState({ element: props.element });
  const { checkboxProps } = useTodoListElement(state);
  const readOnly = useReadOnly();

  return (
    <div contentEditable={false}>
      <Checkbox
        className={cn(
          "-left-6 absolute top-1",
          readOnly && "pointer-events-none",
        )}
        {...checkboxProps}
      />
    </div>
  );
}

function TodoLi(props: PlateElementProps & { lineBreakBadge?: React.ReactNode; }) {
  return (
    <li
      className={cn(
        "list-none",
        (props.element.checked as boolean) &&
        "text-muted-foreground line-through",
      )}
    >
      {props.children}
      {props.lineBreakBadge}
    </li>
  );
}

const config: Record<
  string,
  {
    Li: React.FC<PlateElementProps & { lineBreakBadge?: React.ReactNode; }>;
    Marker: React.FC<PlateElementProps>;
  }
> = {
  todo: {
    Li: TodoLi,
    Marker: TodoMarker,
  },
};

function List(props: PlateElementProps & { lineBreakBadge?: React.ReactNode; }) {
  const { listStart, listStyleType } = props.element as TListElement;
  const { Li, Marker } = config[listStyleType] ?? {};
  const List = isOrderedList(props.element) ? "ol" : "ul";

  return (
    <List
      className="relative m-0 p-0"
      style={{ listStyleType }}
      start={listStart}
    >
      {Marker && <Marker {...props} />}
      {Li ? (
        <Li {...props} />
      ) : (
        <li>
          {props.children}
          {props.lineBreakBadge}
        </li>
      )}
    </List>
  );
}

const BlockList: RenderNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;
  if (!isOrderedList(props.element)) return;

  return (props) => <List {...props} />;
};

export { BlockList };
