type GoogleAccountChipProps = {
  name: string;
};

export const GoogleAccountChip = ({ name }: GoogleAccountChipProps) => {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4c3d9e] text-[10px] font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};