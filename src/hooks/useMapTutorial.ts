import { useState, useEffect } from 'react';

const STORAGE_KEY = 'flashcard_map_tutorial_completed';

export interface TutorialStep {
  id: number;
  message: string;
  target?: string; // CSS selector or ID to highlight
  position: 'center' | 'bottom' | 'top-right' | 'top-left';
}

const STEPS: TutorialStep[] = [
  {
    id: 1,
    message: "マップビューへようこそ！この無限のキャンバスを使って、知識を体系的に整理しましょう。",
    position: 'center'
  },
  {
    id: 2,
    message: "画面下部の「ハンドトレイ」からカードをドラッグして、マップ上に配置できます。",
    target: '.hand-tray',
    position: 'bottom'
  },
  {
    id: 3,
    message: "ノード間をドラッグしてカードをつなぎましょう。線をダブルクリックすると、接続タイプを変更できます。",
    position: 'center'
  },
  {
    id: 4,
    message: "「保存」ボタンで配置を記録できます。探索を楽しみましょう！",
    target: '.save-button',
    position: 'top-right'
  }
];

export function useMapTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  return {
    isActive,
    currentStep: STEPS[currentStepIndex],
    totalSteps: STEPS.length,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === STEPS.length - 1,
    nextStep,
    prevStep,
    skipTutorial,
    resetTutorial: () => {
        localStorage.removeItem(STORAGE_KEY);
        setCurrentStepIndex(0);
        setIsActive(true);
    }
  };
}
