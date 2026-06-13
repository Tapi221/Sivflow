"use client";
import type * as React from "react";
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

const TODO_CHECKBOX_CLASSNAME = "-left-6 absolute top-1 size-4 border-input bg-background shadow-none data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background";
const TodoMarker = (props: PlateElementProps) => {
  const state = useTodoListElementState({ element: props.element });
  const todoProps = Object.values(useTodoListElement(state))[0];
  const readOnly = useReadOnly();
  return (
    <div contentEditable={false}>
      <Checkbox
        className={cn(
          TODO_CHECKBOX_CLASSNAME,
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
