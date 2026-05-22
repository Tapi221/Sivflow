import { PlusIcon } from "@/components/icons/schedule.icons";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

type AddGoogleCalendarButtonProps = {
  hasGoogleAccounts: boolean;
  isConnecting: boolean;
  onAddCalendar: () => void;
};

const BUTTON_CLASS_NAME =
  "flex h-7 w-full items-center gap-2 rounded-[12px] border border-white/70 bg-white/80 px-2 text-left transition-all duration-150 hover:bg-white active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55";

export const AddGoogleCalendarButton = ({
  hasGoogleAccounts,
  isConnecting,
  onAddCalendar,
}: AddGoogleCalendarButtonProps) => {
  const t = useT();

  return (
    <button
      type="button"
      className={cn(BUTTON_CLASS_NAME, hasGoogleAccounts && "mt-2")}
      onClick={onAddCalendar}
      disabled={isConnecting}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#007aff] text-white">
        <PlusIcon className="h-3 w-3" />
      </span>

      <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#4b5563]">
        {hasGoogleAccounts ? t.addAnotherGoogleAccount : t.addGoogleCalendar}
      </span>
    </button>
  );
};
