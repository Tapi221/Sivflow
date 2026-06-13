import { ListStyleType, toggleList } from "@platejs/list";
import { useIndentTodoToolBarButton, useIndentTodoToolBarButtonState } from "@platejs/list/react";
import { ListIcon, ListOrderedIcon, ListTodoIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

type ListToolbarButtonProps = ToolbarButtonProps & {
  listStyleType?: ListStyleType;
};

const ListToolbarButton = ({ listStyleType = ListStyleType.Disc, onClick, ...props }: ListToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      onClick={(event) => {
        onClick?.(event);
        toggleList(editor, { listStyleType });
      }}
    />
  );
};

const BulletedListToolbarButton = ({ children, tooltip = "Bulleted list", ...props }: ToolbarButtonProps) => {
  return (
    <ListToolbarButton listStyleType={ListStyleType.Disc} tooltip={tooltip} {...props}>
      {children ?? <ListIcon />}
    </ListToolbarButton>
  );
};

const NumberedListToolbarButton = ({ children, tooltip = "Numbered list", ...props }: ToolbarButtonProps) => {
  return (
    <ListToolbarButton listStyleType={ListStyleType.Decimal} tooltip={tooltip} {...props}>
      {children ?? <ListOrderedIcon />}
    </ListToolbarButton>
  );
};

const TodoListToolbarButton = ({ children, tooltip = "Todo list", ...props }: ToolbarButtonProps) => {
  const state = useIndentTodoToolBarButtonState({ nodeType: "todo" });
  const { props: buttonProps } = useIndentTodoToolBarButton(state);
  return (
    <ToolbarButton tooltip={tooltip} {...props} {...buttonProps}>
      {children ?? <ListTodoIcon />}
    </ToolbarButton>
  );
};

export { BulletedListToolbarButton, ListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton };
export type { ListToolbarButtonProps };
