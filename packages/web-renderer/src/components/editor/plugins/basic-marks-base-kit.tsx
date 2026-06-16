import { BaseBoldPlugin, BaseCodePlugin, BaseHighlightPlugin, BaseItalicPlugin, BaseKbdPlugin, BaseStrikethroughPlugin, BaseSubscriptPlugin, BaseSuperscriptPlugin, BaseUnderlinePlugin } from "@platejs/basic-nodes";
import { CodeLeafStatic } from "@web-renderer/chip/ui/plate/code-node-static";
import { HighlightLeafStatic } from "@web-renderer/chip/ui/plate/highlight-node-static";
import { KbdLeafStatic } from "@web-renderer/chip/ui/plate/kbd-node-static";

const BaseBasicMarksKit = [
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseCodePlugin.withComponent(CodeLeafStatic),
  BaseStrikethroughPlugin,
  BaseSubscriptPlugin,
  BaseSuperscriptPlugin,
  BaseHighlightPlugin.withComponent(HighlightLeafStatic),
  BaseKbdPlugin.withComponent(KbdLeafStatic),
];

export { BaseBasicMarksKit };
