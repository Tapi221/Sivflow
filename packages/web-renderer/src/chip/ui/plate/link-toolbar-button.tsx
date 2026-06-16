import { useLinkToolbarButton, useLinkToolbarButtonState } from "@platejs/link/react";
import type { ToolbarButtonProps } from "@web-renderer/chip/ui/plate/toolbar";
import { ToolbarButton } from "@web-renderer/chip/ui/plate/toolbar";
import { LinkIcon } from "lucide-react";

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
