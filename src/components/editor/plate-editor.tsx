'use client';

import { normalizeStaticValue } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { Editor, EditorContainer } from '@/components/ui/editor';

import { EditorKit } from './editor-kit';
import { SettingsDialog } from './settings-dialog';

const value = normalizeStaticValue([
  {
    children: [{ text: 'Welcome to the Plate Playground!' }],
    type: 'h1',
  },
  {
    children: [
      { text: 'Experience a modern rich-text editor built with ' },
      { children: [{ text: 'Slate' }], type: 'a', url: 'https://slatejs.org' },
      { text: ' and ' },
      { children: [{ text: 'React' }], type: 'a', url: 'https://reactjs.org' },
      { text: ". This playground showcases part of Plate's capabilities." },
    ],
    type: 'p',
  },
  {
    children: [{ text: 'Rich Content Editing' }],
    type: 'h2',
  },
  {
    children: [
      { text: 'Use headings, lists, quotes, marks, links, mentions, emojis, slash commands, tables, media, comments, suggestions, and drag handles from the Plate plugin kit.' },
    ],
    type: 'p',
  },
  {
    children: [
      {
        children: [
          { children: [{ children: [{ text: 'Feature' }], type: 'p' }], type: 'th' },
          { children: [{ children: [{ text: 'Status' }], type: 'p' }], type: 'th' },
        ],
        type: 'tr',
      },
      {
        children: [
          { children: [{ children: [{ text: 'Plate plugins' }], type: 'p' }], type: 'td' },
          { children: [{ children: [{ text: 'Enabled' }], type: 'p' }], type: 'td' },
        ],
        type: 'tr',
      },
    ],
    type: 'table',
  },
  {
    children: [{ text: '' }],
    type: 'p',
  },
]);

const PlateEditor = () => {
  const editor = usePlateEditor({
    plugins: EditorKit,
    value,
  });

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor variant="demo" />
      </EditorContainer>

      <SettingsDialog />
    </Plate>
  );
};

export { PlateEditor };
