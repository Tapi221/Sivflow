import { useState } from "react";

const LanguagePane = () => {
  const [lang, setLang] = useState("ja");

  return (
    <div>
      <h2>言語設定</h2>

      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="ja">日本語</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguagePane;