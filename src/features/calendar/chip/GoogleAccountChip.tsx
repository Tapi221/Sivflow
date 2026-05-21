type GoogleAccountChipProps = {
  name: string;
  photoUrl?: string | null;
};

export const GoogleAccountChip = ({ name, photoUrl }: GoogleAccountChipProps) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-[24px] max-h-[24px] min-h-[24px] w-[24px] max-w-[24px] min-w-[24px] shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex h-[24px] max-h-[24px] min-h-[24px] w-[24px] max-w-[24px] min-w-[24px] shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[12px] font-semibold leading-none text-[#5f6368]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};