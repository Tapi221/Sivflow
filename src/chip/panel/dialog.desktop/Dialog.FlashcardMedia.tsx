import { Volume2, X } from "@/chip/icons";
import { ReferencePopup } from "./Dialog.ReferencePopup";
import { Dialog, DialogContent } from "@/chip/panel/dialog.desktop/dialog/dialog";
import { Button } from "@/chip/button/button/button";
import type { FlashcardMediaLike } from "@/components/card/frame/flashcard.types";
import { AudioPlayer, ImageGallery } from "@/components/card/media/CardMedia";
import type { ReferenceBlockData } from "@/types";



interface FlashcardMediaDialogsProps {
  isImagePopupOpen: boolean;
  setIsImagePopupOpen: (open: boolean) => void;
  isAudioPopupOpen: boolean;
  setIsAudioPopupOpen: (open: boolean) => void;
  isReferencePopupOpen: boolean;
  setIsReferencePopupOpen: (open: boolean) => void;
  activeImageItems: FlashcardMediaLike[];
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReferenceBlockData[];
}



const FlashcardMediaDialogs = ({ isImagePopupOpen, setIsImagePopupOpen, isAudioPopupOpen, setIsAudioPopupOpen, isReferencePopupOpen, setIsReferencePopupOpen, activeImageItems, activeImages, activeAudioUrls, activeReferences }: FlashcardMediaDialogsProps) => {
  return (
    <>
      <ReferencePopup isOpen={isReferencePopupOpen} onClose={() => setIsReferencePopupOpen(false)} references={activeReferences} />
      <Dialog open={isImagePopupOpen} onOpenChange={setIsImagePopupOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto border-none bg-transparent p-0 shadow-none">
          <div className="relative min-h-48 rounded-2xl bg-white p-4 shadow-2xl md:p-6">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200" onClick={() => setIsImagePopupOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
            <div className="mt-8 space-y-4">
              <ImageGallery urls={activeImages} items={activeImageItems} />
            </div>
            {activeImageItems.length === 0 && activeImages.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                画像がありません
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAudioPopupOpen} onOpenChange={setIsAudioPopupOpen}>
        <DialogContent className="w-full rounded-2xl border-none bg-white p-6 shadow-2xl sm:max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-700">
              <Volume2 className="h-5 w-5 text-amber-500" />
              音声再生
            </h3>
            <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-100" onClick={() => setIsAudioPopupOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="py-2">
            <AudioPlayer urls={activeAudioUrls} />
          </div>
          {activeAudioUrls.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              音声がありません
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};



export { FlashcardMediaDialogs };


export type { FlashcardMediaDialogsProps };
