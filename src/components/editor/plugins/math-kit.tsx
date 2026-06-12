"use client";

import { MathRules } from "@platejs/math";
import { EquationPlugin, InlineEquationPlugin } from "@platejs/math/react";
import { EquationElement, InlineEquationElement } from "@/chip/ui/node/equation-node";

const MathKit = [InlineEquationPlugin.configure({ inputRules: [MathRules.markdown({ variant: "$" })], node: { component: InlineEquationElement } }), EquationPlugin.configure({ inputRules: [MathRules.markdown({ on: "break", variant: "$$" })], node: { component: EquationElement } })];

export { MathKit };
