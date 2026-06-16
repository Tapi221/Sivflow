import type { ToolbarButtonProps } from "@web-renderer/chip/ui/plate/toolbar";
import { ToolbarButton } from "@web-renderer/chip/ui/plate/toolbar";
import { useMarkToolbarButton, useMarkToolbarButtonState } from "platejs/react";

type MarkToolbarButtonProps = ToolbarButtonProps & {
  nodeType: string;
};

const MarkToolbarButton = ({ nodeType, ...props }: MarkToolbarButtonProps) => {
  const state = useMarkToolbarButtonState({ nodeType });
  const { props: buttonProps } = useMarkToolbarButton(state);
  return <ToolbarButton {...props} {...buttonProps} />;
};

export { MarkToolbarButton };
export type { MarkToolbarButtonProps };
