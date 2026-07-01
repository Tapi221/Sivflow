/**
 * Flashcard の下部ナビゲーション（Previous / Next / インデックス表示）
 */
import { Button } from "@web-renderer/chip/button/button/button";
import { ChevronLeft, ChevronRight } from "@web-renderer/chip/icons";



interface FlashcardNavigationProps {
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalCards?: number;
}



const FlashcardNavigation = ({ onNext, onPrev, hasNext, hasPrev, currentIndex, totalCards }: FlashcardNavigationProps) => {
  const showNav = onNext || onPrev || (currentIndex !== undefined && totalCards !== undefined);
  if (!showNav) return null;

  return (
    <div className="flex items-center justify-between mt-8 px-4">
      <Button
        variant="ghost"
        onClick={onPrev}
        disabled={
          !hasPrev &&
          (!onPrev || (currentIndex !== undefined && currentIndex === 0))
        }
        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full h-12 px-6"
      >
        <ChevronLeft className="w-5 h-5 mr-2" />
        <span className="font-medium">Previous</span>
      </Button>

      {currentIndex !== undefined && totalCards !== undefined && (
        <span className="text-sm font-bold text-slate-300 tracking-widest">
          {currentIndex + 1} / {totalCards}
        </span>
      )}

      <Button
        variant="ghost"
        onClick={onNext}
        disabled={
          !hasNext &&
          (!onNext ||
            (currentIndex !== undefined &&
              totalCards !== undefined &&
              currentIndex === totalCards - 1))
        }
        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full h-12 px-6"
      >
        <span className="font-medium">Next</span>
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};



export { FlashcardNavigation };
