import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/chip/panel/dialog.desktop/dialog/dialog";
import type { ReferenceBlockData } from "@/types";
import { ExternalLink, Globe, Link as LinkIcon } from "@/chip/icons";

interface ReferencePopupProps {
  isOpen: boolean;
  onClose: () => void;
  references: ReferenceBlockData[];
}

const resolveReferenceHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
const ReferencePopup = ({ isOpen, onClose, references }: ReferencePopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-3xl border-none p-0 shadow-2xl sm:max-w-96">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <LinkIcon className="h-5 w-5 text-primary-600" />
            参考資料
          </DialogTitle>
          <DialogDescription className="text-xs font-medium tracking-widest text-slate-400 uppercase">
            {references.length} 件のリンクがあります
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 pb-8">
          {references.map((reference, index) => (
            <a key={`${reference.url}-${index}`} href={reference.url} target="_blank" rel="noopener noreferrer" className="group block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-primary-100 hover:bg-primary-50 active:scale-[0.98]">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl border border-slate-100 bg-white p-2.5 text-slate-400 shadow-sm transition-colors group-hover:border-primary-100 group-hover:text-primary-500">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate font-bold text-slate-800 transition-colors group-hover:text-primary-700">
                      {reference.name ?? "外部リンク"}
                    </h4>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary-400" />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="truncate font-serif text-xs text-slate-400">
                      {resolveReferenceHost(reference.url)}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ReferencePopup };
export type { ReferencePopupProps };
