import { useLinkToolbarButton, useLinkToolbarButtonState } from "@platejs/link/react";
import { LinkIcon } from "lucide-react";
import type { ToolbarButtonProps } from "./toolbar";
import { ToolbarButton } from "./toolbar";



type LinkToolbarButtonProps = ToolbarButtonProps;



const LinkToolbarButton = ({ children, ...props }: LinkToolbarButtonProps) => {
  const state = useLinkToolbarButtonState();
  const { props: buttonProps } = useLinkToolbarButton(state);
  return (
    <ToolbarButton {...props} {...buttonProps} data-plate-focus tooltip="Link">
      {children ?? <LinkIcon />}
    </ToolbarButton>
  );
};



export { LinkToolbarButton };


export type { LinkToolbarButtonProps };
