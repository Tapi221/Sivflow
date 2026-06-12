import { BaseCalloutPlugin } from "@platejs/callout";
import { CalloutElementStatic } from "@/chip/ui/node/callout-node-static";

const BaseCalloutKit = [BaseCalloutPlugin.withComponent(CalloutElementStatic)];

export { BaseCalloutKit };
