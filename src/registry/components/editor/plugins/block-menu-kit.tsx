'use client';

import { BlockMenuPlugin } from '@platejs/selection/react';

import { BlockContextMenu } from '@/registry/ui/block-context-menu';

import { BlockSelectionKit } from './block-selection-kit';

const BlockMenuKit = [
  ...BlockSelectionKit,
  BlockMenuPlugin.configure({
    render: { aboveEditable: BlockContextMenu },
  }),
];

export { BlockMenuKit };
