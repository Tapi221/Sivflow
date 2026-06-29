import {
  type HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { JournalDatePickerContext } from './context';
import { ResizeViewport } from './viewport';

export interface JournalDatePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
  date: string;
  onChange: (date: string) => void;
  withDotDates: Set<string | null | undefined>;
}
export const JournalDatePicker = ({
  date: selected,
  onChange,
  withDotDates,
  ...attrs
}: JournalDatePickerProps) => {
  const [cursor, setCursor] = useState(selected);
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth
  );

  // should update cursor when selected modified outside
  useEffect(() => {
    setCursor(selected);
  }, [selected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onSelect = useCallback(
    (date: string) => {
      setCursor(date);
      onChange(date);
    },
    [onChange]
  );
  const journalDatePickerContextValue = useMemo(
    () => ({
      selected,
      onSelect,
      cursor,
      setCursor,
      width,
      withDotDates,
    }),
    [cursor, onSelect, selected, width, withDotDates]
  );

  return (
    <JournalDatePickerContext.Provider value={journalDatePickerContextValue}>
      <ResizeViewport {...attrs} />
    </JournalDatePickerContext.Provider>
  );
};
