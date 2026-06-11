import { BaseCommentPlugin } from "@platejs/comment";
import { CommentLeafStatic } from "@/components/ui/comment-node-static";

const BaseCommentKit = [BaseCommentPlugin.withComponent(CommentLeafStatic)];

export { BaseCommentKit };
