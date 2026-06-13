import { useIndentButton, useOutdentButton } from "@platejs/indent/react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

type IndentToolbarButtonProps = ToolbarButtonProps & {
  reverse?: boolean;
};

const IndentToolbarButton = ({ reverse, ...props }: IndentToolbarButtonProps) => {
  const { props: buttonProps } = reverse ? useOutdentButton() : useIndentButton();
  return (
    <ToolbarButton {...props} {...buttonProps} tooltip={reverse ? "Outdent" : "Indent"} />
  );
};

export { IndentToolbarButton };
export type { IndentToolbarButtonProps };
