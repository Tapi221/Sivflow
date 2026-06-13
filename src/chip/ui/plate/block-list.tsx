"use client";

import * as React from "react";

import { isOrderedList } from "@platejs/list";

import { useTodoListElement, useTodoListElementState } from "@platejs/list/react";

import type { TListElement } from "platejs";

import type { PlateElementProps, RenderNodeWrapper } from "platejs/react";

import { useReadOnly } from "platejs/react";

import { Checkbox } from "@/chip/ui/checkbox";

import { cn } from "@/lib/utils";

type ListItemProps = PlateElementProps & {
  lineBreakBadge?: React.ReactNode;
};

type ListConfig = Record<
  string,
  {
    Li: React.FC<ListItemProps>;
    Marker: React.FC<PlateElementProps>;
  }
>;

const TodoMarker = (props: PlateElementProps) => {
  const state = useTodoListElementState({ element: props.element });
  const todoProps = Object.values(useTodoListElement(state))[0];
  const readOnly = useReadOnly();
  return (
    <div contentEditable={false}>
      <Checkbox
        className={cn(
          "-left-6 absolute top-1",
          readOnly && "pointer-events-none",
        )}
        {...todoProps}
      />
    </div>
  );
};

const TodoLi = (props: ListItemProps) => {
  return (
    <li
      className={cn(
        "list-none",
        (props.element.checked as boolean) && "text-muted-foreground line-through",
      )}
    >
      {props.children}
      {props.lineBreakBadge}
    </li>
  );
};

const config: ListConfig = {
  todo: {
    Li: TodoLi,
    Marker: TodoMarker,
  },
};

const List = (props: ListItemProps) => {
  const { listStart, listStyleType } = props.element as TListElement;
  const { Li, Marker } = config[listStyleType] ?? {};
  const ListTag = isOrderedList(props.element) ? "ol" : "ul";
  return (
    <ListTag className="relative m-0 p-0" style={{ listStyleType }} start={listStart}>
      {Marker ? <Marker {...props} /> : null}
      {Li ? (
        <Li {...props} />
      ) : (
        <li>
          {props.children}
          {props.lineBreakBadge}
        </li>
      )}
    </ListTag>
  );
};

const BlockList: RenderNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;
  if (!isOrderedList(props.element)) return;
  return (nextProps) => <List {...nextProps} />;
};

export { BlockList };
