/**
 * Flashcard のメディアポップアップ UI
 *
 * - 画像ダイアログ
 * - 音声ダイアログ
 * - 参考リンクポップアップ（ReferencePopup）
 */
import { Button } from "@/components/ui/button";
import { X, Volume2 } from "@/ui/icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AudioPlayer } from "../media/CardMedia";
import { ReferencePopup } from "../overlays/ReferencePopup";
import type { ReferenceBlockData } from "@/types";

interface FlashcardMediaDialogsProps {
  isImagePopupOpen: boolean;
  setIsImagePopupOpen: (open: boolean) => void;
  isAudioPopupOpen: boolean;
  setIsAudioPopupOpen: (open: boolean) => void;
  isReferencePopupOpen: boolean;
  setIsReferencePopupOpen: (open: boolean) => void;
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReferenceBlockData[];
}

export function FlashcardMediaDialogs({
  isImagePopupOpen,
  setIsImagePopupOpen,
  isAudioPopupOpen,
  setIsAudioPopupOpen,
  isReferencePopupOpen,
  setIsReferencePopupOpen,
  activeImages,
  activeAudioUrls,
  activeReferences,
}: FlashcardMediaDialogsProps) {
  return (
    <>
      <ReferencePopup
        isOpen={isReferencePopupOpen}
        onClose={() => setIsReferencePopupOpen(false)}
        references={activeReferences}
      />

      <Dialog open={isImagePopupOpen} onOpenChange={setIsImagePopupOpen}>
        <DialogContent className="max-w-5xl w-full p-0 bg-transparent border-none shadow-none max-h-[90vh] overflow-y-auto">
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl relative min-h-[200px]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500"
              onClick={() => setIsImagePopupOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="mt-8 space-y-4">
              {activeImages.map((url, index) => (
                <div key={`${url}-${index}`} className="w-full">
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="w-full h-auto rounded-lg border border-slate-100 shadow-sm"
                  />
                </div>
              ))}
            </div>
            {activeImages.length === 0 && (
              <div className="flex items-center justify-center py-20 text-slate-400">
                画像がありません
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAudioPopupOpen} onOpenChange={setIsAudioPopupOpen}>
        <DialogContent className="sm:max-w-md w-full bg-white border-none shadow-2xl p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-500" />
              音声再生
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-slate-100 text-slate-400"
              onClick={() => setIsAudioPopupOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="py-2">
            <AudioPlayer urls={activeAudioUrls} />
          </div>

          {activeAudioUrls.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              音声がありません
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}



