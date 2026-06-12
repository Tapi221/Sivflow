import type { MouseEventHandler } from "react";

type TodoToggleControlProps = {
  checked?: boolean;
  className?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

const C = ({ checked, disabled, onCheckedChange, onClick }: TodoToggleControlProps) => {
  return <button disabled={disabled} onClick={(event) => { onClick?.(event); onCheckedChange?.(!checked); }} />;
};

export const Checkbox = C;
