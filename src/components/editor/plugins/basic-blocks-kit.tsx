"use client";

import { BlockquoteRules, HeadingRules, HorizontalRuleRules } from "@platejs/basic-nodes";
import { BlockquotePlugin, H1Plugin, H2Plugin, H3Plugin, H4Plugin, H5Plugin, H6Plugin, HorizontalRulePlugin } from "@platejs/basic-nodes/react";
import { ParagraphPlugin } from "platejs/react";
import { BlockquoteElement } from "@/chip/ui/node/blockquote-node";
import { H1Element, H2Element, H3Element, H4Element, H5Element, H6Element } from "@/chip/ui/node/heading-node";
import { HrElement } from "@/chip/ui/node/hr-node";
import { ParagraphElement } from "@/chip/ui/paragraph-node";

const BasicBlocksKit = [ParagraphPlugin.withComponent(ParagraphElement), H1Plugin.configure({ inputRules: [HeadingRules.markdown()], node: { component: H1Element }, rules: { break: { empty: "reset" } }, shortcuts: { toggle: { keys: "mod+alt+1" } } }), H2Plugin.configure({ inputRules: [HeadingRules.markdown()], node: { component: H2Element }, rules: { break: { empty: "reset" } }, shortcuts: { toggle: { keys: "mod+alt+2" } } }), H3Plugin.configure({ inputRules: [HeadingRules.markdown()], node: { component: H3Element }, rules: { break: { empty: "reset" } }, shortcuts: { toggle: { keys: "mod+alt+3" } } }), H4Plugin.configure({ inputRules: [HeadingRules.markdown()], node: { component: H4Element }, rules: { break: { empty: "reset" } }, shortcuts: { toggle: { keys: "mod+alt+4" } } }), H5Plugin.configure({ inputRules: [HeadingRules.markdown()], node: { component: H5Element }, rules: { break: { empty: "reset" } }, shortcuts: { toggle: { keys: "mod+alt+5" } } }), H6Plugin.configure({ inputRules: [HeadingRules.markdown()], node: { component: H6Element }, rules: { break: { empty: "reset" } }, shortcuts: { toggle: { keys: "mod+alt+6" } } }), BlockquotePlugin.configure({ inputRules: [BlockquoteRules.markdown()], node: { component: BlockquoteElement }, shortcuts: { toggle: { keys: "mod+shift+period" } } }), HorizontalRulePlugin.configure({ inputRules: [HorizontalRuleRules.markdown({ variant: "-" }), HorizontalRuleRules.markdown({ variant: "_" })], node: { component: HrElement } })];

export { BasicBlocksKit };
