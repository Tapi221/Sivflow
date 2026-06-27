import type { LlmRequest } from '../../native';
import type { PromptMessage } from '../../plugins/copilot/providers/types';

const createPromptMessage = (role: PromptMessage['role'], content: string, extra: Omit<PromptMessage, 'role' | 'content'> = {}): PromptMessage => {
  return {
    role,
    content,
    ...extra,
  };
};

export const userPrompt = (content: string, extra: Omit<PromptMessage, 'role' | 'content'> = {}): PromptMessage => { return createPromptMessage('user', content, extra);
};

export const assistantPrompt = (content: string, extra: Omit<PromptMessage, 'role' | 'content'> = {}): PromptMessage => { return createPromptMessage('assistant', content, extra);
};

export const systemPrompt = (content: string, extra: Omit<PromptMessage, 'role' | 'content'> = {}): PromptMessage => { return createPromptMessage('system', content, extra);
};

export const promptMessages = (...messages: PromptMessage[]) => { return messages;
};

export const singleUserPromptMessages = (content: string, extra: Omit<PromptMessage, 'role' | 'content'> = {}) => { return promptMessages(userPrompt(content, extra));
};

export const jsonOnlyPromptMessages = (userContent: string) => { return promptMessages( systemPrompt('Return JSON only.'), userPrompt(userContent) );
};

type NativeTextMessage = LlmRequest['messages'][number];

export const nativeUserText = (text: string): NativeTextMessage => { return { role: 'user', content: [{ type: 'text', text }], };
};

export const nativeAssistantText = (text: string): NativeTextMessage => { return { role: 'assistant', content: [{ type: 'text', text }], };
};

export const nativeMessages = (...messages: NativeTextMessage[]) => { return messages;
};
