import LanguagePane from "./panes/LanguagePane";
import { SettingSection } from "./hooks/useSettingDialog";

type Props = {
  selected: SettingSection;
};

const SettingPane = ({ selected }: Props) => {
  switch (selected) {
    case "language":
      return <LanguagePane />;
  }
};

export default SettingPane;