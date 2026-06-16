import type { ToolbarButtonProps } from "./toolbar";
import { ToolbarButton } from "./toolbar";
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
