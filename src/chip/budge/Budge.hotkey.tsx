import { Command as CommandIcon } from "lucide-react";



type HotkeyBadgeProps = {
  className?: string;
  keyLabel?: string;
};



const HOTKEY_BADGE_CLASS_NAME = "ml-auto flex h-5 min-w-8 items-center justify-center gap-0.5 rounded bg-slate-100 px-1.5 text-xs font-semibold leading-none tracking-tight text-[#85827e]";
const HOTKEY_BADGE_ICON_CLASS_NAME = "h-3 w-3 shrink-0";
const HOTKEY_BADGE_KEY_CLASS_NAME = "leading-none";



const joinClassNames = (...classNames: Array<string | false | null | undefined>): string => classNames.filter(Boolean).join(" ");
const getHotkeyAriaLabel = (keyLabel: string): string => `Command ${keyLabel}`;



const HotkeyBadge = ({ className, keyLabel = "K" }: HotkeyBadgeProps) => {
  return (
    <kbd className={joinClassNames(HOTKEY_BADGE_CLASS_NAME, className)} aria-label={getHotkeyAriaLabel(keyLabel)}>
      <CommandIcon className={HOTKEY_BADGE_ICON_CLASS_NAME} aria-hidden="true" strokeWidth={1.75} />
      <span className={HOTKEY_BADGE_KEY_CLASS_NAME}>{keyLabel}</span>
    </kbd>
  );
};



export { HotkeyBadge };
