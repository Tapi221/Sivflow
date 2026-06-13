import { MessageSquareIcon } from "lucide-react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

type CommentToolbarButtonProps = ToolbarButtonProps;

const CommentToolbarButton = ({ children, ...props }: CommentToolbarButtonProps) => (
  <ToolbarButton tooltip="Comment" {...props}>
    {children ?? <MessageSquareIcon />}
  </ToolbarButton>
);

export { CommentToolbarButton };
export type { CommentToolbarButtonProps };
