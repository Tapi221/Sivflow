type GoogleAccountChipProps = {
  name: string;
  photoUrl?: string | null;
};



const GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME = "size-4";



const GoogleAccountChip = ({ name, photoUrl }: GoogleAccountChipProps) => {
  if (photoUrl) {
    return (<img src={photoUrl} alt={name} className={`${GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />);
  }

  return (
    <div
      className={`${GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME} flex shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-xs font-semibold leading-none text-[#5f6368]`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};



export { GoogleAccountChip };
