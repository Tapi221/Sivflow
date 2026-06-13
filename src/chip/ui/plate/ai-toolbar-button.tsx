import { BotIcon } from "lucide-react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

type AiToolbarButtonProps = ToolbarButtonProps;

const AiToolbarButton = ({ children, ...props }: AiToolbarButtonProps) => (
  <ToolbarButton tooltip="AI" {...props}>
    {children ?? <BotIcon />}
  </ToolbarButton>
);

export { AiToolbarButton };
export type { AiToolbarButtonProps };
