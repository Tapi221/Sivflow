import { DocxExportPlugin } from "@platejs/docx-io";
import { KEYS } from "platejs";
import { CalloutElementDocx } from "@/chip/ui/plate/callout-node-static";
import { CodeBlockElementDocx, CodeLineElementDocx, CodeSyntaxLeafDocx } from "@/chip/ui/plate/code-block-node-static";
import { ColumnElementDocx, ColumnGroupElementDocx } from "@/chip/ui/plate/column-node-static";
import { EquationElementDocx, InlineEquationElementDocx } from "@/chip/ui/plate/equation-node-static";
import { TocElementDocx } from "@/chip/ui/plate/toc-node-static";

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
