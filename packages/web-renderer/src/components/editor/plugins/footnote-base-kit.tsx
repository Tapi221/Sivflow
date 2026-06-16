import { BaseFootnoteDefinitionPlugin, BaseFootnoteReferencePlugin } from "@platejs/footnote";
import { FootnoteDefinitionElementStatic, FootnoteReferenceElementStatic } from "@web-renderer/chip/ui/plate/footnote-node-static";

const BaseFootnoteKit = [
  BaseFootnoteReferencePlugin.withComponent(FootnoteReferenceElementStatic),
  BaseFootnoteDefinitionPlugin.withComponent(FootnoteDefinitionElementStatic),
];

export { BaseFootnoteKit };
