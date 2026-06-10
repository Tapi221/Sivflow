'use client';

import { Combobox, ComboboxGroup, ComboboxGroupLabel, ComboboxItem, type ComboboxItemProps, ComboboxPopover, ComboboxProvider, Portal, useComboboxContext, useComboboxStore } from '@ariakit/react';
import { filterWords } from '@platejs/combobox';
import { type UseComboboxInputResult, useComboboxInput, useHTMLInputCursorState } from '@platejs/combobox/react';
import { cva } from 'class-variance-authority';
import type { PointRef, TElement } from 'platejs';
import { useComposedRef, useEditorRef } from 'platejs/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type ComboboxFilterItem = {
  value: string;
  group?: string;
  keywords?: string[];
  label?: string;
};

type FilterFn = (item: ComboboxFilterItem, search: string) => boolean;

type InlineComboboxContextValue = {
  filter: FilterFn | false;
  inputProps: UseComboboxInputResult['props'];
  inputRef: React.RefObject<HTMLInputElement | null>;
  removeInput: UseComboboxInputResult['removeInput'];
  setHasEmpty: (hasEmpty: boolean) => void;
  showTrigger: boolean;
  trigger: string;
};

type InlineComboboxProps = {
  children: React.ReactNode;
  element: TElement;
  trigger: string;
  filter?: FilterFn | false;
  hideWhenNoValue?: boolean;
  setValue?: (value: string) => void;
  showTrigger?: boolean;
  value?: string;
};

const InlineComboboxContext = React.createContext<InlineComboboxContextValue>(null as unknown as InlineComboboxContextValue);

const defaultFilter: FilterFn = ({ group, keywords = [], label, value }, search) => {
  const uniqueTerms = new Set([value, ...keywords, group, label].filter(Boolean));

  return Array.from(uniqueTerms).some((keyword) => filterWords(keyword!, search));
};

const comboboxItemVariants = cva('relative mx-1 flex h-[28px] select-none items-center rounded-sm px-2 text-foreground text-sm outline-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0', {
  defaultVariants: {
    interactive: true,
  },
  variants: {
    interactive: {
      false: '',
      true: 'cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground data-[active-item=true]:bg-accent data-[active-item=true]:text-accent-foreground',
    },
  },
});

const InlineCombobox = ({ children, element, filter = defaultFilter, hideWhenNoValue = false, setValue: setValueProp, showTrigger = true, trigger, value: valueProp }: InlineComboboxProps) => {
  const editor = useEditorRef();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cursorState = useHTMLInputCursorState(inputRef);
  const [valueState, setValueState] = React.useState('');
  const [hasEmpty, setHasEmpty] = React.useState(false);
  const hasValueProp = valueProp !== undefined;
  const value = hasValueProp ? valueProp : valueState;
  const insertPointRef = React.useRef<PointRef | null>(null);

  const setValue = React.useCallback((newValue: string) => {
    setValueProp?.(newValue);

    if (!hasValueProp) setValueState(newValue);
  }, [hasValueProp, setValueProp]);

  React.useEffect(() => {
    insertPointRef.current?.unref();
    insertPointRef.current = null;

    const path = editor.api.findPath(element);
    if (!path) return undefined;

    const point = editor.api.before(path);
    if (!point) return undefined;

    const pointRef = editor.api.pointRef(point);
    insertPointRef.current = pointRef;

    return () => {
      if (insertPointRef.current === pointRef) insertPointRef.current = null;
      pointRef.unref();
    };
  }, [editor, element]);

  const { props: inputProps, removeInput } = useComboboxInput({
    autoFocus: true,
    cancelInputOnBlur: true,
    cursorState,
    ref: inputRef,
    onCancelInput: (cause) => {
      if (cause !== 'backspace') editor.tf.insertText(trigger + value, { at: insertPointRef.current?.current ?? undefined });
      if (cause === 'arrowLeft' || cause === 'arrowRight') editor.tf.move({ distance: 1, reverse: cause === 'arrowLeft' });
    },
  });

  const contextValue = React.useMemo(() => ({ filter, inputProps, inputRef, removeInput, setHasEmpty, showTrigger, trigger }), [filter, inputProps, inputRef, removeInput, setHasEmpty, showTrigger, trigger]);
  const store = useComboboxStore({ setValue: (newValue) => React.startTransition(() => setValue(newValue)) });
  const items = store.useState('items');

  React.useEffect(() => {
    if (!store.getState().activeId) store.setActiveId(store.first());
  }, [items, store]);

  return (
    <span contentEditable={false}>
      <ComboboxProvider open={(items.length > 0 || hasEmpty) && (!hideWhenNoValue || value.length > 0)} store={store}>
        <InlineComboboxContext.Provider value={contextValue}>{children}</InlineComboboxContext.Provider>
      </ComboboxProvider>
    </span>
  );
};

const InlineComboboxInput = ({ className, ref: propRef, ...props }: React.HTMLAttributes<HTMLInputElement> & { ref?: React.RefObject<HTMLInputElement | null> }) => {
  const { inputProps, inputRef: contextRef, showTrigger, trigger } = React.useContext(InlineComboboxContext);
  const store = useComboboxContext()!;
  const value = store.useState('value');
  const ref = useComposedRef(propRef, contextRef);

  return (
    <>
      {showTrigger && trigger}
      <span className="relative min-h-[1lh]">
        <span aria-hidden="true" className="invisible overflow-hidden text-nowrap">{value || '\u200B'}</span>
        <Combobox autoSelect className={cn('absolute top-0 left-0 size-full bg-transparent outline-none', className)} ref={ref} value={value} {...inputProps} {...props} />
      </span>
    </>
  );
};

const InlineComboboxContent: typeof ComboboxPopover = ({ className, ...props }) => {
  const store = useComboboxContext();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!store) return;

    const { activeId, items } = store.getState();
    if (!items.length) return;

    const currentIndex = items.findIndex((item) => item.id === activeId);
    if (event.key === 'ArrowUp' && currentIndex <= 0) {
      event.preventDefault();
      store.setActiveId(store.last());
    } else if (event.key === 'ArrowDown' && currentIndex >= items.length - 1) {
      event.preventDefault();
      store.setActiveId(store.first());
    }
  };

  return (
    <Portal>
      <ComboboxPopover className={cn('z-500 max-h-[288px] w-[300px] overflow-y-auto rounded-md bg-popover shadow-md', className)} onKeyDownCapture={handleKeyDown} {...props} />
    </Portal>
  );
};

const InlineComboboxItem = ({ className, focusEditor = true, group, keywords, label, onClick, ...props }: { focusEditor?: boolean; group?: string; keywords?: string[]; label?: string } & ComboboxItemProps & Required<Pick<ComboboxItemProps, 'value'>>) => {
  const { value } = props;
  const { filter, removeInput } = React.useContext(InlineComboboxContext);
  const store = useComboboxContext()!;
  const search = filter && store.useState('value');
  const visible = React.useMemo(() => !filter || filter({ group, keywords, label, value }, search as string), [filter, group, keywords, label, search, value]);

  if (!visible) return null;

  return <ComboboxItem className={cn(comboboxItemVariants(), className)} onClick={(event) => { removeInput(focusEditor); onClick?.(event); }} {...props} />;
};

const InlineComboboxEmpty = ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => {
  const { setHasEmpty } = React.useContext(InlineComboboxContext);
  const store = useComboboxContext()!;
  const items = store.useState('items');

  React.useEffect(() => {
    setHasEmpty(true);

    return () => {
      setHasEmpty(false);
    };
  }, [setHasEmpty]);

  if (items.length > 0) return null;

  return <div className={cn(comboboxItemVariants({ interactive: false }), className)}>{children}</div>;
};

const InlineComboboxGroup = ({ className, ...props }: React.ComponentProps<typeof ComboboxGroup>) => <ComboboxGroup {...props} className={cn('hidden not-last:border-b py-1.5 [&:has([role=option])]:block', className)} />;

const InlineComboboxGroupLabel = ({ className, ...props }: React.ComponentProps<typeof ComboboxGroupLabel>) => <ComboboxGroupLabel {...props} className={cn('mt-1.5 mb-2 px-3 font-medium text-muted-foreground text-xs', className)} />;

InlineComboboxInput.displayName = 'InlineComboboxInput';

export { InlineCombobox, InlineComboboxContent, InlineComboboxEmpty, InlineComboboxGroup, InlineComboboxGroupLabel, InlineComboboxInput, InlineComboboxItem };
