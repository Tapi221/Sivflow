const codeTheme = {
  plain: { color: "var(--tok-plain)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "var(--tok-comment)" } },
    { types: ["keyword", "atrule"], style: { color: "var(--tok-keyword)" } },
    { types: ["class-name", "builtin", "type"], style: { color: "var(--tok-type)" } },
    { types: ["function"], style: { color: "var(--tok-function)" } },
    { types: ["string", "char", "inserted"], style: { color: "var(--tok-string)" } },
    { types: ["number", "boolean", "constant", "symbol"], style: { color: "var(--tok-number)" } },
    { types: ["operator", "entity", "u\u0072l", "punctuation"], style: { color: "var(--tok-plain)" } },
  ],
};

export { codeTheme };
