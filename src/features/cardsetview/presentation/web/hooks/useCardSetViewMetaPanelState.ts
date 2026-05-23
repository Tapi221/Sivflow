import type { SetStateAction } from "react";

const ignoreMetaPanelStateUpdate = (_value: SetStateAction<boolean>) => {
  void _value;
};

export const useCardSetViewMetaPanelState = () => {
  return {
    isMetaOpen: false,
    setIsMetaOpen: ignoreMetaPanelStateUpdate,
  };
};
