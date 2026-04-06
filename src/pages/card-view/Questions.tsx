import { Navigate } from "react-router-dom";

const Questions = () => {
  // 疑問集ページは現在未実装のため、辞書ページと同様にフォルダ一覧ページへリダイレクトする
  return <Navigate to="/folders" replace />;
};

export default Questions;