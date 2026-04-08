import { Navigate } from "react-router-dom";

const Dictionary = () => {
  // 辞書ページは現在未実装のため、フォルダ一覧ページにリダイレクトする
  return <Navigate to="/folders" replace />;
};

export default Dictionary;
