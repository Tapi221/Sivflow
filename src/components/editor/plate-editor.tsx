'use client';

import { normalizeStaticValue } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from './editor-kit';
import { SettingsDialog } from './settings-dialog';
import { Editor, EditorContainer } from '../ui/editor';

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
      { children: [{ text: 'Feature' }], type: 'th' },
      { children: [{ text: 'Status' }], type: 'th' },
    ],
    type: 'tr',
  },
  {
    children: [
      { children: [{ text: 'Plate plugins' }], type: 'td' },
      { children: [{ text: 'Enabled' }], type: 'td' },
    ],
    type: 'tr',
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
