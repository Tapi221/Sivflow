'use client';

import { AIChatPlugin } from '@platejs/ai/react';
import { CalendarIcon, ChevronRightIcon, Code2, Heading1Icon, Heading2Icon, Heading3Icon, LightbulbIcon, ListIcon, ListOrdered, PilcrowIcon, Quote, RadicalIcon, SparklesIcon, Square, SuperscriptIcon, Table, TableOfContentsIcon } from 'lucide-react';
import { KEYS, type TComboboxInputElement } from 'platejs';
import type { PlateEditor, PlateElementProps } from 'platejs/react';
import { PlateElement } from 'platejs/react';
import type * as React from 'react';

import { insertBlock, insertInlineElement } from '@/registry/components/editor/transforms';

import { InlineCombobox, InlineComboboxContent, InlineComboboxEmpty, InlineComboboxGroup, InlineComboboxGroupLabel, InlineComboboxInput, InlineComboboxItem } from './inline-combobox';

type SlashCommandItem = {
  icon: React.ReactNode;
  value: string;
  onSelect: (editor: PlateEditor, value: string) => void;
  focusEditor?: boolean;
  keywords?: string[];
  label?: string;
};

type SlashCommandGroup = {
  group: string;
  items: SlashCommandItem[];
};

const SLASH_COMMAND_GROUPS: SlashCommandGroup[] = [
  {
    group: 'AI',
    items: [
      {
        focusEditor: false,
        icon: <SparklesIcon />,
        label: 'AI',
        value: 'AI',
        onSelect: (editor) => {
          editor.getApi(AIChatPlugin).aiChat.show();
        },
      },
    ],
  },
  {
    group: 'Basic blocks',
    items: [
      { icon: <PilcrowIcon />, keywords: ['paragraph', 'text'], label: 'Text', value: KEYS.p },
      { icon: <Heading1Icon />, keywords: ['title', 'h1'], label: 'Heading 1', value: KEYS.h1 },
      { icon: <Heading2Icon />, keywords: ['subtitle', 'h2'], label: 'Heading 2', value: KEYS.h2 },
      { icon: <Heading3Icon />, keywords: ['subtitle', 'h3'], label: 'Heading 3', value: KEYS.h3 },
      { icon: <ListIcon />, keywords: ['unordered', 'ul', '-'], label: 'Bulleted list', value: KEYS.ul },
      { icon: <ListOrdered />, keywords: ['ordered', 'ol', '1'], label: 'Numbered list', value: KEYS.ol },
      { icon: <Square />, keywords: ['checklist', 'task', 'checkbox', '[]'], label: 'To-do list', value: KEYS.listTodo },
      { icon: <ChevronRightIcon />, keywords: ['collapsible', 'expandable'], label: 'Toggle', value: KEYS.toggle },
      { icon: <Code2 />, keywords: ['```'], label: 'Code Block', value: KEYS.codeBlock },
      { icon: <Table />, label: 'Table', value: KEYS.table },
      { icon: <Quote />, keywords: ['citation', 'blockquote', 'quote', '>'], label: 'Blockquote', value: KEYS.blockquote },
      { icon: <LightbulbIcon />, keywords: ['note'], label: 'Callout', value: KEYS.callout },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: 'Advanced blocks',
    items: [
      { icon: <TableOfContentsIcon />, keywords: ['toc'], label: 'Table of contents', value: KEYS.toc },
      { focusEditor: false, icon: <RadicalIcon />, label: 'Equation', value: KEYS.equation },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: 'Inline',
    items: [
      { focusEditor: true, icon: <CalendarIcon />, keywords: ['time'], label: 'Date', value: KEYS.date },
      { focusEditor: true, icon: <SuperscriptIcon />, keywords: ['citation', 'fn', 'footnote', '[^]'], label: 'Footnote', value: 'action_footnote' },
      { focusEditor: false, icon: <RadicalIcon />, label: 'Inline Equation', value: KEYS.inlineEquation },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertInlineElement(editor, value);
      },
    })),
  },
];

const SlashInputElement = (props: PlateElementProps<TComboboxInputElement>) => {
  const { editor, element } = props;

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>No results</InlineComboboxEmpty>

          {SLASH_COMMAND_GROUPS.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(({ focusEditor, icon, keywords, label, value, onSelect }) => (
                <InlineComboboxItem focusEditor={focusEditor} group={group} key={value} keywords={keywords} label={label} onClick={() => onSelect(editor, value)} value={value}>
                  <div className="mr-2 text-muted-foreground">{icon}</div>
                  {label ?? value}
                </InlineComboboxItem>
              ))}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
};

export { SlashInputElement };
