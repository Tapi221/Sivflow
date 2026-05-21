type GoogleAccountChipProps = {
  name: string;
  imageUrl?: string | null;
};

export const GoogleAccountChip = ({ name, imageUrl }: GoogleAccountChipProps) => {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f1f3f4] text-[10px] font-semibold text-[#5f6368]">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
};