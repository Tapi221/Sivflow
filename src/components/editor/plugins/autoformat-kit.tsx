'use client';

import type { SlateEditor } from 'platejs';

import { createSlatePlugin, createTextSubstitutionInputRule, KEYS } from 'platejs';

type AutoformatTextSubstitutionPatterns = Parameters<typeof createTextSubstitutionInputRule>[0]['patterns'];

const isTextSubstitutionBlocked = (editor: SlateEditor) =>
  editor.api.some({
    match: {
      type: [editor.getType(KEYS.codeBlock)],
    },
  });

const createAutoformatTextSubstitutionRule = ({
  patterns,
}: {
  patterns: AutoformatTextSubstitutionPatterns;
}) =>
  createTextSubstitutionInputRule({
    enabled: ({ editor }) => !isTextSubstitutionBlocked(editor),
    patterns,
  });

const AUTOFORMAT_SHORTCUTS_PLUGIN = createSlatePlugin({
  key: 'autoformatShortcuts',
  inputRules: [
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '™', match: ['(tm)', '(TM)'] },
        { format: '®', match: ['(r)', '(R)'] },
        { format: '©', match: ['(c)', '(C)'] },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '™', match: '&trade;' },
        { format: '®', match: '&reg;' },
        { format: '©', match: '&copy;' },
        { format: '§', match: '&sect;' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '→', match: '->' },
        { format: '←', match: '<-' },
        { format: '⇒', match: '=>' },
        { format: '⇐', match: ['<=', '≤='] },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '≯', match: '!>' },
        { format: '≮', match: '!<' },
        { format: '≥', match: '>=' },
        { format: '≤', match: '<=' },
        { format: '≱', match: '!>=' },
        { format: '≰', match: '!<=' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '≠', match: '!=' },
        { format: '≡', match: '==' },
        { format: '≢', match: ['!==', '≠='] },
        { format: '≈', match: '~=' },
        { format: '≉', match: '!~=' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '½', match: '1/2' },
        { format: '⅓', match: '1/3' },
        { format: '¼', match: '1/4' },
        { format: '⅕', match: '1/5' },
        { format: '⅙', match: '1/6' },
        { format: '⅐', match: '1/7' },
        { format: '⅛', match: '1/8' },
        { format: '⅑', match: '1/9' },
        { format: '⅒', match: '1/10' },
        { format: '⅔', match: '2/3' },
        { format: '⅖', match: '2/5' },
        { format: '¾', match: '3/4' },
        { format: '⅗', match: '3/5' },
        { format: '⅜', match: '3/8' },
        { format: '⅘', match: '4/5' },
        { format: '⅚', match: '5/6' },
        { format: '⅝', match: '5/8' },
        { format: '⅞', match: '7/8' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '±', match: '+-' },
        { format: '‰', match: '%%' },
        { format: '‱', match: ['%%%', '‰%'] },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '»', match: '>>' },
        { format: '«', match: '<<' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: ['“', '”'], match: '"' },
        { format: ['‘', '’'], match: "'" },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '₀', match: '~0' },
        { format: '₁', match: '~1' },
        { format: '₂', match: '~2' },
        { format: '₃', match: '~3' },
        { format: '₄', match: '~4' },
        { format: '₅', match: '~5' },
        { format: '₆', match: '~6' },
        { format: '₇', match: '~7' },
        { format: '₈', match: '~8' },
        { format: '₉', match: '~9' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '₊', match: '~+' },
        { format: '₋', match: '~-' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '⁰', match: '^0' },
        { format: '¹', match: '^1' },
        { format: '²', match: '^2' },
        { format: '³', match: '^3' },
        { format: '⁴', match: '^4' },
        { format: '⁵', match: '^5' },
        { format: '⁶', match: '^6' },
        { format: '⁷', match: '^7' },
        { format: '⁸', match: '^8' },
        { format: '⁹', match: '^9' },
      ],
    }),
    createAutoformatTextSubstitutionRule({
      patterns: [
        { format: '°', match: '^o' },
        { format: '⁺', match: '^+' },
        { format: '⁻', match: '^-' },
      ],
    }),
  ],
});

export const AutoformatKit = [AUTOFORMAT_SHORTCUTS_PLUGIN];
