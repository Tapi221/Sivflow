import React from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Trophy } from "@web-renderer/chip/icons";
import { Card, CardContent } from "@web-renderer/chip/ui/card";



type Props = {
  folderId: string | null;
  handleBack: () => void;
};



const StudyEmpty = ({ folderId, handleBack }: Props) => {
  return (<Card className="max-w-xl mx-auto mt-16 border border-slate-200/80 bg-white rounded-2xl shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-bottom-2 duration-300"> <CardContent className="py-12 px-8 text-center"> <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50/70"> <Trophy className="w-7 h-7 text-primary-600" /> </div> <h2 className="text-xl font-semibold mb-2 text-slate-800"> 学習するカードがありません </h2> <p className="text-sm text-slate-500 mb-8"> {folderId ? "このフォルダにカードを追加してください" : "今日復習するカードはありません"} </p> <div className="flex flex-wrap justify-center gap-3"> <Button onClick={handleBack} variant="default" className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-6 h-11" > 戻る </Button> </div> </CardContent> </Card>);
};



export { StudyEmpty };
