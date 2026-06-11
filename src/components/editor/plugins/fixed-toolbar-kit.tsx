'use client';

import { createPlatePlugin } from 'platejs/react';

import { FixedToolbar } from '@/components/fixed-toolbar';
import { FixedToolbarButtons } from '@/components/fixed-toolbar-buttons';

const FixedToolbarKit = [
  createPlatePlugin({
    key: 'fixed-toolbar',
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <FixedToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];

export { FixedToolbarKit };
