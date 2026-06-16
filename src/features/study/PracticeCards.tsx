import React from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Card, CardContent } from "@web-renderer/chip/ui/card";
import type { PracticeFilterRating, PracticeSessionState } from "@/features/study/hooks/usePracticeMode";
import StudyCard from "./StudyCard";
import type { Card as StudyEntityCard } from "@/types";



type Props = {
  practiceState: PracticeSessionState;
  practiceCurrentCard: StudyEntityCard | null;
  counterCurrent: number;
  counterTotal: number;
  handlePracticeAnswer: (answer: "ok" | "anxious") => void;
  handleToggleUncertainty: (card: StudyEntityCard) => void;
  handlePracticeExit: (reason?: string) => void;
  ratingLabels: Record<PracticeFilterRating, string>;
};



const PracticeCards = ({ practiceState, practiceCurrentCard, counterCurrent, counterTotal, handlePracticeAnswer, handleToggleUncertainty, handlePracticeExit, ratingLabels }: Props) => {
  return (<div className="reviewMain grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8"> <div className="w-full reviewCardColumn"> {practiceCurrentCard ? (<StudyCard card={practiceCurrentCard} currentIndex={counterCurrent - 1} totalCards={counterTotal} onResult={handlePracticeAnswer} onToggleUncertainty={handleToggleUncertainty} mode="practice" showHard={false} showEasy={false} />) : (<Card className="max-w-xl mx-auto border border-slate-200 rounded-3xl"> <CardContent className="py-10 text-center"> <p className="text-slate-500 mb-6"> 追い復習の対象カードが見つかりません。 </p> <Button onClick={() => handlePracticeExit("missing_card")} className="rounded-xl px-8" > 終了 </Button> </CardContent> </Card>)} </div> <div className="hidden lg:block space-y-6"> <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)]"> <div className="text-xs font-bold tracking-[0.2em] text-slate-300 uppercase mb-3 md:mb-4"> Practice </div> <div className="space-y-2 text-sm text-slate-600"> <p> カテゴリ:{" "} <span className="font-semibold text-slate-700"> {ratingLabels[practiceState.filterRating]} </span> </p> <p> ラウンド:{" "} <span className="font-semibold text-slate-700"> {practiceState.roundNumber} </span> </p> <p> OK(累計):{" "} <span className="font-semibold text-slate-700"> {practiceState.doneCount} </span> </p> <p> 不安(このラウンド):{" "} <span className="font-semibold text-slate-700"> {practiceState.remaining.length} </span> </p> </div> </div> </div> </div>);
};



export { PracticeCards };
