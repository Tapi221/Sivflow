import React from 'react';
import { Button } from '../ui/button';
import { X, ArrowRight, BookOpen } from 'lucide-react';
import type { TutorialStep } from '../../hooks/useMapTutorial';

interface MapTutorialOverlayProps {
  step: TutorialStep;
  currentPixelIndex: number; // 0-indexed
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const MapTutorialOverlay: React.FC<MapTutorialOverlayProps> = ({
  step,
  currentPixelIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip
}) => {
  // Determine positioning styles
  let positionStyles: React.CSSProperties = {};
  
  switch (step.position) {
    case 'center':
      positionStyles = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      break;
    case 'bottom':
      positionStyles = { bottom: '180px', left: '50%', transform: 'translateX(-50%)' };
      break;
    case 'top-right':
      positionStyles = { top: '80px', right: '20px' };
      break;
    case 'top-left':
      positionStyles = { top: '80px', left: '20px' };
      break;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop with hole? For now just semi-transparent simple overlay */}
      {/* <div className="absolute inset-0 bg-black/20" /> */}
      
      {/* Highlighting Target Hint (Optional, sophisticated implementation would use bounding rects) */}
      {step.target && (
         <div className="absolute inset-0 pointer-events-none">
             {/* This requires knowing where the target exists. skipped for simplicity in first pass */}
         </div>
      )}

      {/* Message Card */}
      <div 
        className="absolute pointer-events-auto bg-white rounded-xl shadow-2xl p-6 max-w-sm border-2 border-primary-100 animate-in fade-in zoom-in-95 duration-300"
        style={positionStyles}
      >
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className="bg-primary-100 p-2 rounded-full">
                    <BookOpen className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-bold text-primary-700">ガイド {currentPixelIndex + 1}/{totalSteps}</span>
            </div>
            <button onClick={onSkip} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
            </button>
        </div>
        
        <p className="text-slate-700 mb-6 leading-relaxed">
            {step.message}
        </p>

        <div className="flex justify-between items-center gap-2 mt-6">
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSkip}
                className="text-slate-400 hover:text-slate-600 text-xs"
             >
                スキップ
             </Button>
             
             <div className="flex gap-2">
                {currentPixelIndex > 0 && (
                    <Button 
                        variant="outline"
                        size="sm" 
                        onClick={onPrev}
                        className="text-slate-600"
                    >
                        戻る
                    </Button>
                )}
                <Button 
                    size="sm" 
                    onClick={onNext}
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-200"
                >
                    {currentPixelIndex === totalSteps - 1 ? '完了' : '次へ'} 
                    <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
             </div>
        </div>
      </div>
    </div>
  );
};
