import React from "react";

import { cn } from "@/lib/utils";

type OverlayToolbarIndexNavigatorProps = {
  value: number;
  total: number;
  onCommit: (nextOneBasedValue: number) => void;
  inputAriaLabel: string;
  className?: string;
  inputClassName?: string;
  totalClassName?: string;
};

const normalizeCommittedNavigatorValue = ({
  draftValue,
  fallbackValue,
  total,
}: {
  draftValue: string;
  fallbackValue: number;
  total: number;
}) => {
  const trimmedDraftValue = draftValue.trim();
  if (trimmedDraftValue.length === 0) {
    return fallbackValue;
  }

  const parsedValue = Number(trimmedDraftValue);
  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return Math.min(total, Math.max(1, Math.trunc(parsedValue)));
};

export const OverlayToolbarIndexNavigator = ({
  value,
  total,
  onCommit,
  inputAriaLabel,
  className,
  inputClassName,
  totalClassName,
}: OverlayToolbarIndexNavigatorProps) => {
  const skipNextBlurCommitRef = React.useRef(false);
  const [draftValue, setDraftValue] = React.useState(() => String(value));

  React.useEffect(() => {
    setDraftValue(String(value));
  }, [value, total]);

  const commitInput = React.useCallback(() => {
    if (!Number.isFinite(total) || total <= 0) {
      return;
    }

    const nextCommittedValue = normalizeCommittedNavigatorValue({
      draftValue,
      fallbackValue: value,
      total,
    });

    setDraftValue(String(nextCommittedValue));

    if (nextCommittedValue !== value) {
      onCommit(nextCommittedValue);
    }
  }, [draftValue, onCommit, total, value]);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitizedValue = event.currentTarget.value.replace(/\D+/g, "");
      setDraftValue(sanitizedValue);
    },
    [],
  );

  const handleBlur = React.useCallback(() => {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false;
      return;
    }

    commitInput();
  }, [commitInput]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        skipNextBlurCommitRef.current = true;
        commitInput();
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setDraftValue(String(value));
      }
    },
    [commitInput, value],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[#6b5f55]",
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draftValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-6 w-12 rounded-full border border-[rgba(225,214,203,0.9)] bg-[rgba(255,250,244,0.84)] px-2 text-center text-[10px] font-semibold text-[#463c35] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-[rgba(189,166,144,0.92)] focus:bg-[rgba(255,252,247,0.98)] sm:w-14",
          inputClassName,
        )}
        aria-label={inputAriaLabel}
        data-card-zoom-input-ignore="true"
      />
      <span className={cn("shrink-0", totalClassName)}>/ {total}</span>
    </div>
  );
};
