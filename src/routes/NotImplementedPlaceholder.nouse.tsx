import React from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { ArrowLeft, Construction } from "@web-renderer/chip/icons";
import { useNavigate } from "react-router-dom";



const NotImplementedPlaceholder = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <Construction className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">未実装機能</h1>
        <p className="text-slate-500 mb-8">
          申し訳ありませんが、このモードは現在開発中です。
          <br />
          今後のアップデートをお待ちください。
        </p>
        <Button
          onClick={() => navigate(-1)}
          className="w-full h-12 rounded-xl font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
      </div>
    </div>
  );
};



export default NotImplementedPlaceholder;
