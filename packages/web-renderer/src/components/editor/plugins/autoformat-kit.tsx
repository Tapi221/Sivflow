"use client";

import { createSlatePlugin, createTextSubstitutionInputRule, KEYS } from "platejs";



type AutoformatTextSubstitutionPatterns = Parameters<typeof createTextSubstitutionInputRule>[0]["patterns"];



const AUTOFORMAT_TEXT_SUBSTITUTION_PATTERN_GROUPS = [
  [
    { format: "™", match: ["(tm)", "(TM)"] },
    { format: "®", match: ["(r)", "(R)"] },
    { format: "©", match: ["(c)", "(C)"] },
  ],
  [
    { format: "™", match: "&trade;" },
    { format: "®", match: "&reg;" },
    { format: "©", match: "&copy;" },
    { format: "§", match: "&sect;" },
  ],
  [
    { format: "→", match: "->" },
    { format: "←", match: "<-" },
    { format: "⇒", match: "=>" },
    { format: "⇐", match: ["<=", "≤="] },
  ],
  [
    { format: "≯", match: "!>" },
    { format: "≮", match: "!<" },
    { format: "≥", match: ">=" },
    { format: "≤", match: "<=" },
    { format: "≱", match: "!>=" },
    { format: "≰", match: "!<=" },
  ],
  [
    { format: "≠", match: "!=" },
    { format: "≡", match: "==" },
    { format: "≢", match: ["!==", "≠="] },
    { format: "≈", match: "~=" },
    { format: "≉", match: "!~=" },
  ],
  [
    { format: "½", match: "1/2" },
    { format: "⅓", match: "1/3" },
    { format: "¼", match: "1/4" },
    { format: "⅕", match: "1/5" },
    { format: "⅙", match: "1/6" },
    { format: "⅐", match: "1/7" },
    { format: "⅛", match: "1/8" },
    { format: "⅑", match: "1/9" },
    { format: "⅒", match: "1/10" },
    { format: "⅔", match: "2/3" },
    { format: "⅖", match: "2/5" },
    { format: "¾", match: "3/4" },
    { format: "⅗", match: "3/5" },
    { format: "⅜", match: "3/8" },
    { format: "⅘", match: "4/5" },
    { format: "⅚", match: "5/6" },
    { format: "⅝", match: "5/8" },
    { format: "⅞", match: "7/8" },
  ],
  [
    { format: "±", match: "+-" },
    { format: "‰", match: "%%" },
    { format: "‱", match: ["%%%", "‰%"] },
  ],
  [
    { format: "»", match: ">>" },
    { format: "«", match: "<<" },
  ],
  [
    { format: ["“", "”"], match: '"' },
    { format: ["‘", "’"], match: "'" },
  ],
  [
    { format: "₀", match: "~0" },
    { format: "₁", match: "~1" },
    { format: "₂", match: "~2" },
    { format: "₃", match: "~3" },
    { format: "₄", match: "~4" },
    { format: "₅", match: "~5" },
    { format: "₆", match: "~6" },
    { format: "₇", match: "~7" },
    { format: "₈", match: "~8" },
    { format: "₉", match: "~9" },
  ],
  [
    { format: "₊", match: "~+" },
    { format: "₋", match: "~-" },
  ],
  [
    { format: "⁰", match: "^0" },
    { format: "¹", match: "^1" },
    { format: "²", match: "^2" },
    { format: "³", match: "^3" },
    { format: "⁴", match: "^4" },
    { format: "⁵", match: "^5" },
    { format: "⁶", match: "^6" },
    { format: "⁷", match: "^7" },
    { format: "⁸", match: "^8" },
    { format: "⁹", match: "^9" },
  ],
  [
    { format: "°", match: "^o" },
    { format: "⁺", match: "^+" },
    { format: "⁻", match: "^-" },
  ],
] satisfies AutoformatTextSubstitutionPatterns[];

const AUTOFORMAT_SHORTCUTS_PLUGIN = createSlatePlugin({
  key: "autoformatShortcuts",
  inputRules: AUTOFORMAT_TEXT_SUBSTITUTION_PATTERN_GROUPS.map((patterns) =>
    createTextSubstitutionInputRule({
      enabled: ({ editor }) =>
        !editor.api.some({
          match: {
            type: [editor.getType(KEYS.codeBlock)],
          },
        }),
      patterns,
    }),
  ),
});

const AutoformatKit = [AUTOFORMAT_SHORTCUTS_PLUGIN];



export { AutoformatKit };
