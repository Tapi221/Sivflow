'use client';

import { cn } from '@/lib/utils';

import { Toolbar } from './toolbar';

export function FixedToolbar(props: React.ComponentProps<typeof Toolbar>) {
  return <Toolbar {...props} className={cn('sticky top-0 z-50 w-full justify-between overflow-x-auto border-b bg-background p-1', props.className)} />;
}
