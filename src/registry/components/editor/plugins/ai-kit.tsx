'use client';

import { AIChatPlugin, AIPlugin } from '@platejs/ai/react';
import { AILoadingBar, AIMenu } from '@/registry/ui/ai-menu';
import { AIAnchorElement, AILeaf } from '@/registry/ui/ai-node';
import { MarkdownKit } from './markdown-kit';

export const aiChatPlugin = AIChatPlugin.extend({
  options: {
    chatOptions: {
      api: '/api/ai/command',
      body: {},
    },
  },
  render: {
    afterContainer: AILoadingBar,
    afterEditable: AIMenu,
    node: AIAnchorElement,
  },
  shortcuts: { show: { keys: 'mod+j' } },
});

export const AIKit = [
  ...MarkdownKit,
  AIPlugin.withComponent(AILeaf),
  aiChatPlugin,
];
