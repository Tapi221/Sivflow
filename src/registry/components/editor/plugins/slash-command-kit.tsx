'use client';

import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react';
import { KEYS, type SlateEditor } from 'platejs';

import { SlashInputElement } from '@/registry/ui/slash-node';

const SlashCommandKit = [
  SlashPlugin.configure({
    options: {
      triggerQuery: (editor: SlateEditor) => !editor.api.some({ match: { type: editor.getType(KEYS.codeBlock) } }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInputElement),
];

export { SlashCommandKit };
