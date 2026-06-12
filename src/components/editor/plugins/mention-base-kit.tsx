import { BaseMentionPlugin } from "@platejs/mention";
import { MentionElementStatic } from "@/chip/ui/mention-node-static";

const BaseMentionKit = [BaseMentionPlugin.withComponent(MentionElementStatic)];

export { BaseMentionKit };
