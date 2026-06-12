import { useEffect } from "react";
import { hasPrimaryModifier, isTypingTarget } from "./hotkeyGuards";



type UseReviewCardPagerHotkeysParams = {
  onFlip?: () => void;
  onNext: () => void;
  onPrev: () => void;
};



const useReviewCardPagerHotkeys = ({ onFlip, onNext, onPrev }: UseReviewCardPagerHotkeysParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;
      if (hasPrimaryModifier(event)) return;

      switch (event.key) {
        case " ":
          if (event.shiftKey) return;
          event.preventDefault();
          onFlip?.();
          break;
        case "Enter":
          onFlip?.();
          break;
        case "ArrowDown":
          event.preventDefault();
          onNext();
          break;
        case "ArrowUp":
          event.preventDefault();
          onPrev();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onFlip, onNext, onPrev]);
};



export { useReviewCardPagerHotkeys };
