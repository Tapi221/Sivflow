import { CreateActionPlusIcon } from "@/chip/icon/CreateActionPlusIcon";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

type AddGoogleCalendarButtonProps = {
  hasGoogleAccounts: boolean;
  isConnecting: boolean;
  onAddCalendar: () => void;
};

const BUTTON_CLASS_NAME =
  "group flex h-8 w-full min-w-0 items-center gap-2 overflow-hidden rounded-[16px] border border-[#f2f0ed]/80 bg-[#faf9f7]/90 px-2.5 text-left shadow-[0_1px_3px_rgba(80,72,64,0.04),0_1px_0_rgba(255,255,255,0.86)_inset] transition-all duration-150 hover:border-[#ece8e3] hover:bg-[#f7f5f2] active:scale-[0.985] active:bg-[#f2efeb] disabled:cursor-not-allowed disabled:opacity-55";

const ICON_CLASS_NAME =
  "h-5 w-5 shrink-0 bg-[#f0eeeb] text-[#8f8780] shadow-none ring-1 ring-[#eeeae5] group-hover:bg-[#ebe7e2] group-hover:text-[#7f766f]";

export const AddGoogleCalendarButton = ({
  hasGoogleAccounts,
  isConnecting,
  onAddCalendar,
}: AddGoogleCalendarButtonProps) => {
  const t = useT();

  if (hasGoogleAccounts) return null;

  const label = t.addGoogleCalendar;

  return (
    <button
      type="button"
      className={cn(BUTTON_CLASS_NAME)}
      onClick={onAddCalendar}
      disabled={isConnecting}
      title={label}
      aria-label={label}
    >
      <CreateActionPlusIcon className={ICON_CLASS_NAME} />

      <span className="min-w-0 truncate whitespace-nowrap text-[12px] font-semibold tracking-[-0.01em] text-[#8c847e]">
        {label}
      </span>
    </button>
  );
};
