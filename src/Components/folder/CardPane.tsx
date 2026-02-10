import React from 'react';
import { CardEditorPane } from './CardEditorPane';

interface CardPaneProps {
  selectedCardId: string | null;
  onCardUpdated: () => void;
}

export function CardPane({ selectedCardId, onCardUpdated }: CardPaneProps) {
  return <CardEditorPane selectedCardId={selectedCardId} onCardUpdated={onCardUpdated} />;
}

