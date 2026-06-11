import { BaseFootnoteDefinitionPlugin, BaseFootnoteReferencePlugin } from "@platejs/footnote";
import { FootnoteDefinitionElementStatic, FootnoteReferenceElementStatic } from "@/components/ui/footnote-node-static";



const BaseFootnoteKit = [
  BaseFootnoteReferencePlugin.withComponent(FootnoteReferenceElementStatic),
  BaseFootnoteDefinitionPlugin.withComponent(FootnoteDefinitionElementStatic),
];



export { BaseFootnoteKit };
