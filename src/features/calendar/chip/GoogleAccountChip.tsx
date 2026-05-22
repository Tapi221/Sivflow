type GoogleAccountChipProps = {
  name: string;
  photoUrl?: string | null;
};

const GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME =
  "h-[16px] max-h-[16px] min-h-[16px] w-[16px] max-w-[16px] min-w-[16px]";

export const GoogleAccountChip = ({ name, photoUrl }: GoogleAccountChipProps) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME} shrink-0 rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME} flex shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[8px] font-semibold leading-none text-[#5f6368]`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};