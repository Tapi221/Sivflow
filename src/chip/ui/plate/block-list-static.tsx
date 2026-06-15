import { isOrderedList } from "@platejs/list";
import { CheckIcon } from "lucide-react";
import type { RenderStaticNodeWrapper, TListElement } from "platejs";
import type { SlateRenderElementProps } from "platejs/static";
import type * as React from "react";
import { cn } from "@/lib/utils";



type ListConfig = Record<
  string,
  {
    Li: React.FC<SlateRenderElementProps>;
    Marker: React.FC<SlateRenderElementProps>;
  }
>;



const TODO_CHECKBOX_CLASSNAME = "peer pointer-events-none absolute top-1 -left-6 size-4 shrink-0 rounded border border-input bg-background shadow-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-900 data-[state=checked]:text-neutral-50 dark:bg-input/30 dark:data-[state=checked]:border-neutral-100 dark:data-[state=checked]:bg-neutral-100 dark:data-[state=checked]:text-neutral-900";



const TodoMarkerStatic = (props: SlateRenderElementProps) => {
  const checked = props.element.checked as boolean;
  return (
    <div contentEditable={false}>
      <button
        className={cn(TODO_CHECKBOX_CLASSNAME, props.className)}
        data-state={checked ? "checked" : "unchecked"}
        type="button"
      >
        <div className={cn("flex items-center justify-center text-current")}>
          {checked ? <CheckIcon className="size-4" /> : null}
        </div>
      </button>
    </div>
  );
};
const TodoLiStatic = (props: SlateRenderElementProps) => {
  return (
    <li
      className={cn(
        "list-none",
        (props.element.checked as boolean) && "text-muted-foreground line-through",
      )}
    >
      {props.children}
    </li>
  );
};



const LIST_CONFIG: ListConfig = {
  todo: {
    Li: TodoLiStatic,
    Marker: TodoMarkerStatic,
  },
};



const List = (props: SlateRenderElementProps) => {
  const { indent, listStart, listStyleType } = props.element as TListElement & {
    indent?: number;
  };
  const { Li, Marker } = LIST_CONFIG[listStyleType] ?? {};
  const ListTag = isOrderedList(props.element) ? "ol" : "ul";
  const marginLeft = indent ? `${indent * 24}px` : undefined;
  return (
    <ListTag
      className="relative m-0 p-0"
      start={listStart}
      style={{ listStyleType, marginLeft }}
    >
      {Marker ? <Marker {...props} /> : null}
      {Li ? <Li {...props} /> : <li>{props.children}</li>}
    </ListTag>
  );
};
const BlockListStatic: RenderStaticNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;
  if (!isOrderedList(props.element)) return;
  return (nextProps) => <List {...nextProps} />;
};



export { BlockListStatic };
