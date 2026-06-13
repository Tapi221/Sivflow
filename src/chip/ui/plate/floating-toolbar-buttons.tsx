import { BoldIcon, ItalicIcon, LinkIcon, MessageSquareIcon } from "lucide-react";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";

type FloatingToolbarButtonsProps = {
  withComment?: boolean;
};

const FloatingToolbarButtons = ({ withComment = true }: FloatingToolbarButtonsProps) => (
  <>
    <ToolbarGroup>
      <MarkToolbarButton nodeType="bold" tooltip="Bold">
        <BoldIcon />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Italic">
        <ItalicIcon />
      </MarkToolbarButton>
    </ToolbarGroup>
    <ToolbarGroup>
      <LinkToolbarButton tooltip="Link">
        <LinkIcon />
      </LinkToolbarButton>
      {withComment ? (
        <CommentToolbarButton>
          <MessageSquareIcon />
        </CommentToolbarButton>
      ) : null}
    </ToolbarGroup>
  </>
);

export { FloatingToolbarButtons };
export type { FloatingToolbarButtonsProps };
