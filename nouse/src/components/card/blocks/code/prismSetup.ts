import Prism from "prismjs";



type PrismGlobal = typeof globalThis & {
  Prism?: typeof Prism;
};



(globalThis as PrismGlobal).Prism = Prism;
await import("prismjs/components/prism-clike");
await import("prismjs/components/prism-markup");
await import("prismjs/components/prism-css");
await import("prismjs/components/prism-javascript");
await import("prismjs/components/prism-jsx");
await import("prismjs/components/prism-typescript");
await import("prismjs/components/prism-tsx");
await import("prismjs/components/prism-bash");
await import("prismjs/components/prism-c");
await import("prismjs/components/prism-cpp");
await import("prismjs/components/prism-csharp");
await import("prismjs/components/prism-go");
await import("prismjs/components/prism-java");
await import("prismjs/components/prism-json");
await import("prismjs/components/prism-markdown");
await import("prismjs/components/prism-python");
await import("prismjs/components/prism-rust");
await import("prismjs/components/prism-sql");
await import("prismjs/components/prism-yaml");



export { Prism };
