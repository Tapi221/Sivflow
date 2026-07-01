import React from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Card, CardContent } from "@web-renderer/chip/ui/card";



type PracticeSummaryState = {
  roundNumber: number;
  filterRating: string;
  doneCount: number;
  remaining: unknown[];
};
type Props = {
  practiceState: PracticeSummaryState;
  handlePracticeContinueRound: () => void;
  handlePracticeExit: (reason?: string) => void;
  ratingLabels: Record<string, string>;
};



const PracticeSummary = ({ practiceState, handlePracticeContinueRound, handlePracticeExit, ratingLabels }: Props) => {
  return (<Card className="max-w-2xl mx-auto border-none shadow-xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-500"> <CardContent className="py-12 px-8 text-center relative overflow-hidden"> <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-[#e6f7f3] opacity-80"></div> <div className="relative z-10"> <h2 className="text-2xl font-bold mb-2 text-[#1e293b]"> ラウンド {practiceState.roundNumber} 終了 </h2> <p className="text-sm text-[#64748b] mb-8"> {ratingLabels[practiceState.filterRating] ?? practiceState.filterRating}だけを追い復習中 </p> <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white/95 px-6 py-5 mb-8"> <p className="text-xl font-bold text-slate-700"> OK: {practiceState.doneCount} / 不安:{" "} {practiceState.remaining.length} </p> </div> <div className="flex flex-wrap justify-center gap-3"> {practiceState.remaining.length > 0 ? (<Button onClick={handlePracticeContinueRound} className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-8 h-12 shadow-sm hover:shadow-md transition-all text-base" > 残り（{practiceState.remaining.length}枚）だけもう1周 </Button>) : (<Button onClick={() => handlePracticeExit("completed")} className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-8 h-12 shadow-sm hover:shadow-md transition-all text-base" > 追い復習完了 </Button>)} <Button variant="outline" onClick={() => handlePracticeExit("manual_exit")} className="rounded-xl px-8 h-12 border-slate-200 hover:bg-slate-50 text-[#64748b] text-base" > 終了 </Button> </div> </div> </CardContent> </Card>);
};



export { PracticeSummary };
