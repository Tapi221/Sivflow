import type { ChatMessage } from '@/app/api/ai/command/types';

import dedent from 'dedent';

import { buildStructuredPrompt, formatTextFromMessages, getLastUserInstruction } from '@/app/api/ai/command/utils';

export function getChooseToolPrompt({
  isSelecting,
  messages,
}: {
  isSelecting: boolean;
  messages: ChatMessage[];
}) {
  const generateExamples = [
    dedent`
      <instruction>
        Write a paragraph about AI ethics
      </instruction>
      <output>generate</output>
    `,
    dedent`
      <instruction>
        Create a short poem about spring
      </instruction>
      <output>generate</output>
    `,
    dedent`
      <instruction>
        Summarize this text
      </instruction>
      <output>edit</output>
    `,
  ];

  const editExamples = [
    dedent`
      <instruction>
        Make this more concise
      </instruction>
      <output>edit</output>
    `,
    dedent`
      <instruction>
        Fix the grammar
      </instruction>
      <output>edit</output>
    `,
    dedent`
      <instruction>
        Write a new introduction
      </instruction>
      <output>generate</output>
    `,
  ];

  return buildStructuredPrompt({
    context: formatTextFromMessages(messages),
    examples: isSelecting ? editExamples : generateExamples,
    instruction: getLastUserInstruction(messages),
    system: dedent`
      Decide whether the user wants to generate new content or edit selected content.
      Return only one word: generate or edit.
    `,
  });
}
