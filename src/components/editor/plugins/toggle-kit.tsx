"use client";

import { TogglePlugin } from "@platejs/toggle/react";
import { ToggleElement } from "@web-renderer/chip/ui/plate/toggle-node";
import { IndentKit } from "@/components/editor/plugins/indent-kit";

const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
];

export { ToggleKit };
