import { CardCarousel } from "@/features/study/CardCarousel";
import type { StudyReviewProps } from "@/features/study/presentation/shared/studyReviewProps";



const StudyReviewMobile = ({ cards, sessionCurrentIndex, onResult, onToggleUncertainty, onToggleBookmark, onEdit, showHard, showEasy }: StudyReviewProps) => {
  return (<div className="reviewMain h-full w-full"> <CardCarousel cards={cards} mode="review" sessionCurrentIndex={sessionCurrentIndex} onResult={onResult} onToggleUncertainty={onToggleUncertainty} onToggleBookmark={onToggleBookmark} onEdit={onEdit} showHard={showHard} showEasy={showEasy} /> </div>);
};



export { StudyReviewMobile };
