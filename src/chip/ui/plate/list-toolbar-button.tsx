import { toggleList } from "@platejs/list";
import { useEditorRef } from "platejs/react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

type ListToolbarButtonProps = ToolbarButtonProps & {
  nodeType: string;
};

const ListToolbarButton = ({ nodeType, onClick, ...props }: ListToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      onClick={(event) => {
        onClick?.(event);
        toggleList(editor, { type: nodeType });
      }}
    />
  );
};

export { ListToolbarButton };
export type { ListToolbarButtonProps };
