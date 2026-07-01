import { useState } from "react";
import { MessageSquare } from "@web-renderer/chip/icons";
import { QuickQaChatDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.QuickQaChat";
import type { CSSProperties } from "react";



type Props = {
  className?: string;
  style?: CSSProperties;
};



const WorkspaceActionToolbar = ({ className, style }: Props) => {
  const [isQuickQaOpen, setIsQuickQaOpen] = useState(false);
  return (
    <>
      <div className={className} style={style}>
        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.04)] bg-[#efeeee]/95 px-2.5 text-xs font-semibold leading-none tracking-tight text-[#5f5f5f] shadow-none outline-none backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-[#2f343b] active:scale-[0.99] focus:outline-none focus:ring-0 focus-visible:bg-slate-100 focus-visible:text-[#2f343b] motion-reduce:transition-none motion-reduce:active:scale-100" onClick={() => setIsQuickQaOpen(true)} aria-label="Q&Aチャットを開く" title="Q&Aチャット">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#85827e]" />
          <span>Q&A</span>
        </button>
      </div>
      <QuickQaChatDialog open={isQuickQaOpen} onOpenChange={setIsQuickQaOpen} />
    </>
  );
};



export { WorkspaceActionToolbar };
