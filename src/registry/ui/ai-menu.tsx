'use client';

import * as React from 'react';
import { AIChatPlugin } from '@platejs/ai/react';
import { Loader2Icon, SendIcon, XIcon } from 'lucide-react';
import { useEditorPlugin, useFocusedLast, usePluginOption } from 'platejs/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AIChatState = {
  status?: string;
};

const AI_MENU_CLASS_NAME = 'absolute left-1/2 top-12 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md';
const AI_INPUT_CLASS_NAME = 'h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring';

export function AIMenu() {
  const { api } = useEditorPlugin(AIChatPlugin);
  const open = usePluginOption(AIChatPlugin, 'open') && useFocusedLast();
  const chat = usePluginOption(AIChatPlugin, 'chat') as AIChatState | undefined;
  const [input, setInput] = React.useState('');
  const isLoading = chat?.status === 'streaming' || chat?.status === 'submitted';

  const submit = React.useCallback(() => {
    const nextInput = input.trim();
    if (!nextInput || isLoading) return;

    void api.aiChat.submit(nextInput);
    setInput('');
  }, [api, input, isLoading]);

  const close = React.useCallback(() => {
    api.aiChat.hide();
    setInput('');
  }, [api]);

  if (!open) return null;

  return (
    <div className={AI_MENU_CLASS_NAME} data-plate-ai-menu>
      <div className="flex items-center gap-2">
        <input
          className={AI_INPUT_CLASS_NAME}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask AI anything..."
          data-plate-focus
          autoFocus
        />
        <Button type="button" size="icon" variant="ghost" onClick={submit} disabled={isLoading || input.trim().length === 0}>
          {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={close}>
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AILoadingBar() {
  const chat = usePluginOption(AIChatPlugin, 'chat') as AIChatState | undefined;
  const isLoading = chat?.status === 'streaming' || chat?.status === 'submitted';

  return <div className={cn('h-0.5 w-full bg-primary/70 transition-opacity', isLoading ? 'opacity-100' : 'opacity-0')} />;
}
