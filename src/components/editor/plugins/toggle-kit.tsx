"use client";

import { TogglePlugin } from "@platejs/toggle/react";
import { ToggleElement } from "@/chip/ui/node/toggle-node";
import { IndentKit } from "@/components/editor/plugins/indent-kit";

const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
];

export { ToggleKit };
