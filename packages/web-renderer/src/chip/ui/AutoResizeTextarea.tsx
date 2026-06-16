import { useEffect, useLayoutEffect, useRef } from "react";
import type { ChangeEvent, TextareaHTMLAttributes } from "react";
import { cn } from "@web-renderer/lib/utils";

<<<<<<< HEAD


interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
=======
interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
>>>>>>> c06f65dcf83503eeadd66a314bd7f052edc70c72
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  minRows?: number;
  lineHeight?: number;
  maxHeight?: number;
  allowInternalScroll?: boolean;
  readOnly?: boolean;
}



const AutoResizeTextarea = ({
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
}: AutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const minHeight = minRows * lineHeight;
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.lineHeight = `${lineHeight}px`;
    textarea.style.boxSizing = "border-box";
    const measuredHeight = value === "" ? minHeight : Math.max(textarea.scrollHeight, minHeight);
    const snappedHeight = Math.ceil(measuredHeight / lineHeight) * lineHeight;
    if (allowInternalScroll) {
      const boundedHeight = Math.min(snappedHeight, maxHeight);
      textarea.style.height = `${boundedHeight}px`;
      textarea.style.overflowY = snappedHeight > maxHeight ? "auto" : "hidden";
    } else {
      textarea.style.height = `${snappedHeight}px`;
      if (textarea.style.overflowY !== "hidden") {
        textarea.style.overflowY = "hidden";
      }
    }
    textarea.style.minHeight = `${minHeight}px`;
  }, [value, maxHeight, minHeight, lineHeight, allowInternalScroll]);
  useLayoutEffect(() => {
    if (!allowInternalScroll && textareaRef.current) {
      textareaRef.current.style.setProperty("overflow-y", "hidden", "important");
      textareaRef.current.style.setProperty("overflow-x", "hidden", "important");
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
        "ds-textarea flex w-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all py-0",
        readOnly && "bg-gray-50/50 cursor-default",
        className,
        textareaClassName,
      )}
      style={{
        minHeight: `${minHeight}px`,
        overflowY: allowInternalScroll ? undefined : "hidden",
        ...props.style,
      }}
      {...props}
    />
  );
};

<<<<<<< HEAD


export default AutoResizeTextarea;
=======
export { AutoResizeTextarea };
export type { AutoResizeTextareaProps };
>>>>>>> c06f65dcf83503eeadd66a314bd7f052edc70c72
