/**
 * Flashcard のモーダル/ポップアップ開閉 state と、flip 阻害判定を集約した hook。
 */
import { useCallback, useState } from "react";



interface FlashcardMediaState {
  isImageModalOpen: boolean;
  isImagePopupOpen: boolean;
  isAudioPopupOpen: boolean;
  isReferencePopupOpen: boolean;
  setIsImagePopupOpen: (open: boolean) => void;
  setIsAudioPopupOpen: (open: boolean) => void;
  setIsReferencePopupOpen: (open: boolean) => void;
  /** CardFrame の Gallery から fullscreen 変化を受け取るコールバック */
  handleGalleryFullscreenChange: (isFullscreen: boolean) => void;
  /** いずれかのモーダルが開いており flip をブロックすべき状態か */
  isModalBlockingFlip: boolean;
}



const useFlashcardMediaState = () => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isAudioPopupOpen, setIsAudioPopupOpen] = useState(false);
  const [isReferencePopupOpen, setIsReferencePopupOpen] = useState(false);

  const handleGalleryFullscreenChange = useCallback((isFullscreen: boolean) => {
    setIsImageModalOpen(isFullscreen);
  }, []);

  const isModalBlockingFlip =
    isImageModalOpen ||
    isImagePopupOpen ||
    isAudioPopupOpen ||
    isReferencePopupOpen;

  return {
    isImageModalOpen,
    isImagePopupOpen,
    isAudioPopupOpen,
    isReferencePopupOpen,
    setIsImagePopupOpen,
    setIsAudioPopupOpen,
    setIsReferencePopupOpen,
    handleGalleryFullscreenChange,
    isModalBlockingFlip,
  };
};



export { useFlashcardMediaState };


export type { FlashcardMediaState };
