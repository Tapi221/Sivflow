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
        className="h-6 w-6 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[10px] font-semibold text-[#5f6368]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};