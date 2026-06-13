import { useIndentButton, useOutdentButton } from "@platejs/indent/react";
import { IndentDecreaseIcon, IndentIncreaseIcon } from "lucide-react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

type IndentToolbarButtonProps = ToolbarButtonProps & {
  reverse?: boolean;
};

const IndentToolbarButton = ({ children, reverse, ...props }: IndentToolbarButtonProps) => {
  const { props: buttonProps } = reverse ? useOutdentButton() : useIndentButton();
  return (
    <ToolbarButton {...props} {...buttonProps} tooltip={reverse ? "Outdent" : "Indent"}>
      {children ?? (reverse ? <IndentDecreaseIcon /> : <IndentIncreaseIcon />)}
    </ToolbarButton>
  );
};

export { IndentToolbarButton };
export type { IndentToolbarButtonProps };
