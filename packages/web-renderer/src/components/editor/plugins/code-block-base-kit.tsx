import { BaseCodeBlockPlugin, BaseCodeLinePlugin, BaseCodeSyntaxPlugin } from "@platejs/code-block";
import { CodeBlockElementStatic, CodeLineElementStatic, CodeSyntaxLeafStatic } from "@web-renderer/chip/ui/plate/code-block-node-static";
import { all, createLowlight } from "lowlight";



const lowlight = createLowlight(all);
const BaseCodeBlockKit = [
  BaseCodeBlockPlugin.configure({
    node: { component: CodeBlockElementStatic },
    options: { lowlight },
  }),
  BaseCodeLinePlugin.withComponent(CodeLineElementStatic),
  BaseCodeSyntaxPlugin.withComponent(CodeSyntaxLeafStatic),
];



export { BaseCodeBlockKit };
