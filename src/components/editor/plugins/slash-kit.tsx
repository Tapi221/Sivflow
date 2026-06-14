"use client";

import { SlashInputPlugin, SlashPlugin } from "@platejs/slash-command/react";
import type { SlateEditor } from "platejs";
import { KEYS } from "platejs";
import { SlashInputElement } from "@/chip/ui/plate/slash-node";

const SlashKit = [
  SlashPlugin.configure({
    options: {
      triggerQuery: (editor: SlateEditor) => !editor.api.some({
        match: { type: editor.getType(KEYS.codeBlock) },
      }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInputElement),
];

export { SlashKit };
