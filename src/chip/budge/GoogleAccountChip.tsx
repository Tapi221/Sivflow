import { GoogleIcon } from "@/chip/icons/icons.nouse";

type GoogleAccountChipProps = {
  name: string;
  photoUrl?: string | null;
};

const GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME = "size-[16px]";

export const GoogleAccountChip = ({ name }: GoogleAccountChipProps) => (
  <GoogleIcon
    className={`${GOOGLE_ACCOUNT_CHIP_SIZE_CLASS_NAME} shrink-0 text-[#5f6368]`}
    label={name}
  />
);
