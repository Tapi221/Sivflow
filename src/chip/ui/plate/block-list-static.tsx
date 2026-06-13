import type * as React from "react";
import { isOrderedList } from "@platejs/list";
import { CheckIcon } from "lucide-react";
import type { RenderStaticNodeWrapper, TListElement } from "platejs";
import type { SlateRenderElementProps } from "platejs/static";
import { cn } from "@/lib/utils";

type ListConfig = Record<
  string,
  {
    Li: React.FC<SlateRenderElementProps>;
    Marker: React.FC<SlateRenderElementProps>;
  }
>;

const TODO_CHECKBOX_CLASSNAME = "peer -left-6 pointer-events-none absolute top-1 size-4 shrink-0 rounded-sm border border-input bg-background text-background shadow-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background";

const TodoMarkerStatic = (props: SlateRenderElementProps) => {
  const checked = props.element.checked === true;
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
        props.element.checked === true && "text-muted-foreground line-through",
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
      style={{ listStyleType, marginLeft }}
      start={listStart}
    >
      {Marker ? <Marker {...props} /> : null}
      {Li ? <Li {...props} /> : <li>{props.children}</li>}
    </ListTag>
  );
};
const BlockListStatic: RenderStaticNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;
  return (nextProps) => <List {...nextProps} />;
};

export { BlockListStatic };
