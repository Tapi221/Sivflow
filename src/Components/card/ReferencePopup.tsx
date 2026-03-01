import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ReferenceBlockData } from '@/types';
import Globe from 'lucide-react/dist/esm/icons/globe';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import { cn } from '@/lib/utils';

interface ReferencePopupProps {
  isOpen: boolean;
  onClose: () => void;
  references: ReferenceBlockData[];
}

export const ReferencePopup = ({ isOpen, onClose, references }: ReferencePopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary-600" />
            参考資料
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            {references.length} 件のリンクがあります
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-8 space-y-3 max-h-[60vh] overflow-y-auto">
          {references.map((ref, index) => {
            return (
              <a
                key={index}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-4 bg-slate-50 hover:bg-primary-50 rounded-2xl border border-slate-100 hover:border-primary-100 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl shrink-0 bg-white border border-slate-100 text-slate-400 group-hover:text-primary-500 group-hover:border-primary-100 transition-colors shadow-sm">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                        {ref.name || '外部リンク'}
                      </h4>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-primary-400 shrink-0 mt-0.5" />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 truncate font-serif">
                        {(() => {
                          try {
                            return new URL(ref.url).hostname;
                          } catch (e) {
                            return ref.url;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
