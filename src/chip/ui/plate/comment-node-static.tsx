import type { TCommentText } from "platejs";
import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";

const CommentLeafStatic = (props: SlateLeafProps<TCommentText>) => {
  return <SlateLeaf {...props} className="border-b-2 border-b-highlight/35 bg-highlight/15">{props.children}</SlateLeaf>;
};

export { CommentLeafStatic };
