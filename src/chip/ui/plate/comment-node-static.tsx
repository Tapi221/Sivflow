import type { TCommentText } from "platejs";
import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";

const CommentLeafStatic = (props: SlateLeafProps<TCommentText>) => {
  return <SlateLeaf {...props} className="border-b-2 border-b-muted-foreground/35 bg-muted-foreground/15">{props.children}</SlateLeaf>;
};

export { CommentLeafStatic };
