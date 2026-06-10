'use client';

import * as React from 'react';

import { DropdownMenuItemIndicator, type DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import { SuggestionPlugin } from '@platejs/suggestion/react';
import { CheckIcon, EyeIcon, PencilLineIcon, PenIcon } from 'lucide-react';
import { useEditorReadOnly, useEditorRef, usePluginOption } from 'platejs/react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/registry/ui/shadcn/dropdown-menu';

import { ToolbarButton } from './toolbar';

type ModeToolbarItem = {
  icon: React.ReactNode;
  label: string;
};

const items: Record<string, ModeToolbarItem> = {
  editing: {
    icon: <PenIcon />,
    label: 'Editing',
  },
  suggestion: {
    icon: <PencilLineIcon />,
    label: 'Suggestion',
  },
  viewing: {
    icon: <EyeIcon />,
    label: 'Viewing',
  },
};

function Indicator() {
  return (
    <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <CheckIcon />
      </DropdownMenuItemIndicator>
    </span>
  );
}

function ModeToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const readOnly = useEditorReadOnly();
  const [open, setOpen] = React.useState(false);

  const isSuggesting = usePluginOption(SuggestionPlugin, 'isSuggesting');

  let value = 'editing';

  if (readOnly) value = 'viewing';

  if (isSuggesting) value = 'suggestion';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Editing mode" isDropdown>
          {items[value].icon}
          <span className="hidden lg:inline">{items[value].label}</span>
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuRadioGroup
          onValueChange={(newValue) => {
            if (newValue === 'viewing') {
              editor.store.setReadOnly(true);

              return;
            }
            editor.store.setReadOnly(false);

            if (newValue === 'suggestion') {
              editor.setOption(SuggestionPlugin, 'isSuggesting', true);

              return;
            }
            editor.setOption(SuggestionPlugin, 'isSuggesting', false);

            if (newValue === 'editing') {
              editor.tf.focus();
            }
          }}
          value={value}
        >
          <DropdownMenuRadioItem className="*:[svg]:text-muted-foreground" value="editing" hideIndicator>
            <Indicator />
            {items.editing.icon}
            {items.editing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem className="*:[svg]:text-muted-foreground" value="viewing" hideIndicator>
            <Indicator />
            {items.viewing.icon}
            {items.viewing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem className="*:[svg]:text-muted-foreground" value="suggestion" hideIndicator>
            <Indicator />
            {items.suggestion.icon}
            {items.suggestion.label}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ModeToolbarButton };
