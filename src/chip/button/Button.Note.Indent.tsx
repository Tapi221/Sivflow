import { useIndentButton, useOutdentButton } from "@platejs/indent/react";
import { IndentDecreaseIcon, IndentIncreaseIcon } from "lucide-react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

const ButtonNoteIndent = (props: ToolbarButtonProps) => {
  const { props: buttonProps } = useIndentButton();
  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Indent">
      <IndentIncreaseIcon />
    </ToolbarButton>
  );
};
const ButtonNoteOutdent = (props: ToolbarButtonProps) => {
  const { props: buttonProps } = useOutdentButton();
  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Outdent">
      <IndentDecreaseIcon />
    </ToolbarButton>
  );
};

export { ButtonNoteIndent, ButtonNoteOutdent };
