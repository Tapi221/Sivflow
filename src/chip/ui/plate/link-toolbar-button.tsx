import { useLinkToolbarButton, useLinkToolbarButtonState } from "@platejs/link/react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

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
