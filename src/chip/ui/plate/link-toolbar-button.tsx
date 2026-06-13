import { useLinkToolbarButton, useLinkToolbarButtonState } from "@platejs/link/react";
import type { ToolbarButtonProps } from "./toolbar";
import { ToolbarButton } from "./toolbar";



type LinkToolbarButtonProps = ToolbarButtonProps;



const LinkToolbarButton = (props: LinkToolbarButtonProps) => {
  const state = useLinkToolbarButtonState();
  const { props: buttonProps } = useLinkToolbarButton(state);
  return (
    <ToolbarButton {...props} {...buttonProps} data-plate-focus tooltip="Link">
      {props.children}
    </ToolbarButton>
  );
};



export { LinkToolbarButton };


export type { LinkToolbarButtonProps };
