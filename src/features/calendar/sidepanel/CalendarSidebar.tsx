const GoogleAccountSection = ({
  account,
  onToggleCalendar,
  onReconnect,
  onRetry,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const accountName = account.name ?? account.email ?? "Google";

  return (
    <div className="mt-2">
      <button
        type="button"
        className="group flex h-7 w-full items-center gap-1.5 px-1 text-left"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <GoogleAccountChip name={accountName} photoUrl={account.photoUrl} />

        {account.email && (
          <span className="truncate text-[11px] font-semibold tracking-wider text-[#9aa0aa]">
            {account.email}
          </span>
        )}

        <span
          className={cn(
            "ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform duration-200",
            !isOpen && "-rotate-90",
          )}
        >
          <IconChevronRight className="h-3 w-3 text-[#9aa0aa]" />
        </span>
      </button>

      {isOpen &&
        account.calendars.map((calendar) => {
          const checked = account.selectedCalendarIds.has(calendar.id);

          return (
            <button
              key={calendar.id}
              type="button"
              className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 pl-7 text-left transition-colors hover:bg-[#eceef1]"
              onClick={() => onToggleCalendar(calendar.id)}
              aria-pressed={checked}
            >
              <AnimatedCircleCheckbox
                checked={checked}
                color={calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR}
              />

              <span className="truncate text-[12px] font-medium text-[#3d4049]">
                {calendar.summary}
              </span>
            </button>
          );
        })}

      {isOpen && account.calendars.length === 0 && (
        <p className="px-7 py-1 text-[11px] text-[#b0b5bf]">
          読み込み中…
        </p>
      )}

      {account.connectionStatus === "needsReconnect" && (
        <div className="mt-1 px-2">
          <p className="text-[11px] leading-relaxed text-[#a16207]">
            再連携が必要です。
          </p>
          <button
            type="button"
            className="mt-1 rounded-md bg-[#fff7ed] px-2 py-1 text-[11px] font-semibold text-[#9a3412] hover:bg-[#ffedd5]"
            onClick={onReconnect}
          >
            再連携
          </button>
        </div>
      )}

      {account.error && (
        <p className="mt-1 px-2 text-[11px] leading-relaxed text-[#b42318]">
          {account.error}
        </p>
      )}

      {account.connectionStatus === "error" && (
        <div className="mt-1 px-2">
          <button
            type="button"
            className="rounded-md bg-[#fef2f2] px-2 py-1 text-[11px] font-semibold text-[#b42318] hover:bg-[#fee2e2]"
            onClick={onRetry}
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
};