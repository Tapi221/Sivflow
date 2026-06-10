'use client';

import * as React from 'react';

import { PlateElement } from 'platejs/react';

import { cn } from '@/lib/utils';

export function CalloutElement({ attributes, children, className, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement
      className={cn('my-1 flex rounded-sm bg-muted p-4 pl-3', className)}
      style={{
        backgroundColor: props.element.backgroundColor as any,
      }}
      attributes={{
        ...attributes,
        'data-plate-open-context-menu': true,
      }}
      {...props}
    >
      <div className="flex w-full gap-2 rounded-md">
        <span className="size-6 select-none text-[18px]" contentEditable={false} data-plate-prevent-deserialization>
          {(props.element.icon as any) || '💡'}
        </span>
        <div className="w-full">{children}</div>
      </div>
    </PlateElement>
  );
}
