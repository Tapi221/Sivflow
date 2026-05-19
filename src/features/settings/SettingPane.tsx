import LanguagePane from "./panes/LanguagePane";
import { SettingSection } from "./hooks/useSettingDialog";

type Props = {
  selected: SettingSection;
};

const paneMap: Record<SettingSection, React.ReactNode> = {
  language: <LanguagePane />,
};

const SettingPane = ({ selected }: Props) => {
  return paneMap[selected] ?? null;
};

export default SettingPane;
