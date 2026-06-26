import { DocxExportPlugin } from "@platejs/docx-io";
import { CalloutElementDocx } from "@web-renderer/chip/ui/plate/callout-node-static";
import { CodeBlockElementDocx, CodeLineElementDocx, CodeSyntaxLeafDocx } from "@web-renderer/chip/ui/plate/code-block-node-static";
import { ColumnElementDocx, ColumnGroupElementDocx } from "@web-renderer/chip/ui/plate/column-node-static";
import { EquationElementDocx, InlineEquationElementDocx } from "@web-renderer/chip/ui/plate/equation-node-static";
import { TocElementDocx } from "@web-renderer/chip/ui/plate/toc-node-static";
import { KEYS } from "platejs";



const DocxExportKit = [
  DocxExportPlugin.configure({
    override: {
      components: {
        [KEYS.callout]: CalloutElementDocx,
        [KEYS.codeBlock]: CodeBlockElementDocx,
        [KEYS.codeLine]: CodeLineElementDocx,
        [KEYS.codeSyntax]: CodeSyntaxLeafDocx,
        [KEYS.column]: ColumnElementDocx,
        [KEYS.columnGroup]: ColumnGroupElementDocx,
        [KEYS.equation]: EquationElementDocx,
        [KEYS.inlineEquation]: InlineEquationElementDocx,
        [KEYS.toc]: TocElementDocx,
      },
    },
  }),
];



export { DocxExportKit };
