import { BaseCommentPlugin } from "@platejs/comment";
import { CommentLeafStatic } from "@web-renderer/chip/ui/plate/comment-node-static";

const BaseCommentKit = [BaseCommentPlugin.withComponent(CommentLeafStatic)];

export { BaseCommentKit };
