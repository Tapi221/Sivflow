type GoogleAccountChipProps = {
  name: string;
  photoUrl: string | null;
};

export const GoogleAccountChip = ({ name, photoUrl }: GoogleAccountChipProps) => {
  if (!photoUrl) {
    return null;
  }

  return (
    <img
      src={photoUrl}
      alt={name}
      className="h-6 w-6 shrink-0 rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  );
};