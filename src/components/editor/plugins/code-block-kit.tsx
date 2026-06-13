"use client";

import { CodeBlockRules } from "@platejs/code-block";

import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from "@platejs/code-block/react";

import { all, createLowlight } from "lowlight";

import { CodeBlockElement, CodeLineElement, CodeSyntaxLeaf } from "@/chip/ui/plate/code-block-node";



const lowlight = createLowlight(all);

const CodeBlockKit = [
  CodeBlockPlugin.configure({
    inputRules: [CodeBlockRules.markdown({ on: "match" })],
    node: { component: CodeBlockElement },
    options: { lowlight },
    shortcuts: { toggle: { keys: "mod+alt+8" } },
  }),
  CodeLinePlugin.withComponent(CodeLineElement),
  CodeSyntaxPlugin.withComponent(CodeSyntaxLeaf),
];



export { CodeBlockKit };
