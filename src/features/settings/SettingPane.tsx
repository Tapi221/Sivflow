import { SettingSection } from "./hooks/useSettingDialog";
import LanguagePane from "./panes/LanguagePane";

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
