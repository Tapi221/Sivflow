import { BoldIcon, ItalicIcon, LinkIcon, MessageSquareIcon } from "lucide-react";
import { CommentToolbarButton } from "./comment-toolbar-button";
import { LinkToolbarButton } from "./link-toolbar-button";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { ToolbarGroup } from "./toolbar";



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
