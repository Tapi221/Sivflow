type MoreMenuButtonProps = {
  onClick?: () => void;
};

export const MoreMenuButton = ({ onClick }: MoreMenuButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e9eaed] text-[#8f929c] transition-colors hover:bg-[#f7f8fa]"
      aria-label="More options"
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <circle cx="3.5" cy="8" r="1" fill="currentColor" />
        <circle cx="8" cy="8" r="1" fill="currentColor" />
        <circle cx="12.5" cy="8" r="1" fill="currentColor" />
      </svg>
    </button>
  );
};