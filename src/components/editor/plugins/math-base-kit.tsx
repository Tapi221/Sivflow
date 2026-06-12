import { BaseEquationPlugin, BaseInlineEquationPlugin } from "@platejs/math";
import { EquationElementStatic, InlineEquationElementStatic } from "@/chip/ui/equation-node-static";

const BaseMathKit = [
  BaseInlineEquationPlugin.withComponent(InlineEquationElementStatic),
  BaseEquationPlugin.withComponent(EquationElementStatic),
];

export { BaseMathKit };
