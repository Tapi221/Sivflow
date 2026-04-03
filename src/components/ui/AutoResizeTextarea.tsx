import React, { useRef, useEffect, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  minRows?: number;
  lineHeight?: number;
  maxHeight?: number;
  allowInternalScroll?: boolean;
  readOnly?: boolean;
}

export default function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  textareaClassName,
  minRows = 1,
  lineHeight = 20,
  maxHeight = 400,
  allowInternalScroll = true,
  readOnly = false,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const minHeight = minRows * lineHeight;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Ensure explicit line-height to make height calculations deterministic
    textarea.style.lineHeight = `${lineHeight}px`;
    // Use border-box to ensure height includes padding/border
    textarea.style.boxSizing = "border-box";

    // Calculate new height from content (newlines + wraps)
    const measuredHeight =
      value === "" ? minHeight : Math.max(textarea.scrollHeight, minHeight);
    const snappedHeight = Math.ceil(measuredHeight / lineHeight) * lineHeight;

    if (allowInternalScroll) {
      const boundedHeight = Math.min(snappedHeight, maxHeight);
      textarea.style.height = `${boundedHeight}px`;
      textarea.style.overflowY = snappedHeight > maxHeight ? "auto" : "hidden";
    } else {
      textarea.style.height = `${snappedHeight}px`;
      // Allow overflowY to be controlled by the style prop for non-scrollable textareas
      if (textarea.style.overflowY !== "hidden") {
        textarea.style.overflowY = "hidden";
      }
    }

    textarea.style.minHeight = `${minHeight}px`;
  }, [value, maxHeight, minHeight, lineHeight, allowInternalScroll]);

  // Force hidden overflow when internal scroll is disabled to prevent scrollbar flickering
  useLayoutEffect(() => {
    if (!allowInternalScroll && textareaRef.current) {
      textareaRef.current.style.setProperty(
        "overflow-y",
        "hidden",
        "important",
      );
      // Also hide x overflow just in case
      textareaRef.current.style.setProperty(
        "overflow-x",
        "hidden",
        "important",
      );
    }
  }, [allowInternalScroll]);

  return (
    <textarea
      ref={textareaRef}
      rows={minRows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        "flex w-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all py-0",
        readOnly && "bg-gray-50/50 cursor-default",
        className,
        textareaClassName,
      )}
      style={{
        minHeight: `${minHeight}px`,
        // Force hidden overflow when internal scroll is disabled to prevent scrollbar flickering
        // Note: style prop doesn't support !important, so we use useLayoutEffect above
        overflowY: allowInternalScroll ? undefined : "hidden",
        ...props.style,
      }}
      {...props}
    />
  );
}





