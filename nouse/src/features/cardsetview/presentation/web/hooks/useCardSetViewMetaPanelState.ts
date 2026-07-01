import type { SetStateAction } from "react";



const ignoreMetaPanelStateUpdate = (_value: SetStateAction<boolean>) => {
  void _value;
};
const useCardSetViewMetaPanelState = () => {
  return { isMetaOpen: false, setIsMetaOpen: ignoreMetaPanelStateUpdate };
};



export { useCardSetViewMetaPanelState };
