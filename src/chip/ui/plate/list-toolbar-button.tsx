import { toggleList } from "@platejs/list";
import { useEditorRef } from "platejs/react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

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
        toggleList(editor, { listStyleType: nodeType });
      }}
    />
  );
};

export { ListToolbarButton };
export type { ListToolbarButtonProps };
