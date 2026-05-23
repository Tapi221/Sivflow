import { SettingSection } from "./hooks/useSettingDialog";
import LanguagePane from "./panes/LanguagePane";
import OpenAiPane from "./panes/OpenAiPane";

type Props = {
  selected: SettingSection;
};

const paneMap: Record<SettingSection, React.ReactNode> = {
  language: <LanguagePane />,
  openai: <OpenAiPane />,
};

const SettingPane = ({ selected }: Props) => {
  return paneMap[selected] ?? null;
};

export default SettingPane;