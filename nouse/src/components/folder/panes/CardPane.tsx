import { CardEditorPane } from "./CardEditorPane";
import { CardQuestionLinksPanel } from "./CardQuestionLinksPanel";



interface CardPaneProps {
  selectedCardId: string | null;
  onCardUpdated: () => void;
}



const CardPane = ({ selectedCardId, onCardUpdated }: CardPaneProps) => {
  return (<div className="relative h-full min-h-0 w-full overflow-hidden"> <CardEditorPane selectedCardId={selectedCardId} onCardUpdated={onCardUpdated} /> <CardQuestionLinksPanel selectedCardId={selectedCardId} /> </div>);
};



export { CardPane };
