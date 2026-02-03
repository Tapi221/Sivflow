import React, { useState } from 'react';
import { Flashcard } from './Flashcard';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface CardPopupProps {
  card: any;
  onClose: () => void;
  onEdit?: (card: any) => void;
  onToggleUncertainty?: (card: any) => void;
  onToggleBookmark?: (card: any) => void;
}

export function CardPopup({ 
    card, 
    onClose, 
    onEdit, 
    onToggleUncertainty, 
    onToggleBookmark 
}: CardPopupProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
         onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 md:-top-12 md:-right-4 text-slate-800 md:text-white bg-white/50 md:bg-transparent hover:bg-white/80 md:hover:bg-white/20 rounded-full z-50"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
        <Flashcard
          card={card}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
          onEdit={onEdit}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          className="h-auto min-h-[500px]"
        />
      </div>
    </div>
  );
}
