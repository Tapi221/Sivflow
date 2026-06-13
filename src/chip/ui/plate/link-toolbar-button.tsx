import { BaseLinkPlugin } from "@platejs/link";
import { useEditorRef } from "platejs/react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

type LinkToolbarButtonProps = ToolbarButtonProps;

const LinkToolbarButton = ({ onClick, ...props }: LinkToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      onClick={(event) => {
        onClick?.(event);
        editor.getApi(BaseLinkPlugin).link.showFloatingLink();
      }}
    />
  );
};

export { LinkToolbarButton };
export type { LinkToolbarButtonProps };
