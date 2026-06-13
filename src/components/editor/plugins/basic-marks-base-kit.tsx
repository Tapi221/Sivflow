import { BaseBoldPlugin, BaseCodePlugin, BaseHighlightPlugin, BaseItalicPlugin, BaseKbdPlugin, BaseStrikethroughPlugin, BaseSubscriptPlugin, BaseSuperscriptPlugin, BaseUnderlinePlugin } from "@platejs/basic-nodes";
import { CodeLeafStatic } from "@/chip/ui/plate/code-node-static";
import { HighlightLeafStatic } from "@/chip/ui/plate/highlight-node-static";
import { KbdLeafStatic } from "@/chip/ui/plate/kbd-node-static";

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
