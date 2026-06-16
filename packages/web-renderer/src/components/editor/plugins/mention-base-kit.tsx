import { BaseMentionPlugin } from "@platejs/mention";
import { MentionElementStatic } from "@web-renderer/chip/ui/plate/mention-node-static";

const BaseMentionKit = [BaseMentionPlugin.withComponent(MentionElementStatic)];

export { BaseMentionKit };
