import { useState } from "react";
import type { CSSProperties } from "react";
import { MessageSquare } from "@/ui/icons";
import { QuickQaChatDialog } from "./QuickQaChatDialog";



type Props = { className?: string; style?: CSSProperties; };



const WorkspaceActionToolbar = ({ className, style }: Props) => {
  const [isQuickQaOpen, setIsQuickQaOpen] = useState(false);

  return (
    <>
      <div className={className} style={style}>
        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[rgba(0,0,0,0.04)] bg-[#efeeee]/95 px-2.5 text-[12px] font-semibold leading-none tracking-[-0.012em] text-[#5f5f5f] shadow-none outline-none backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-[#eee] hover:text-[#2f343b] active:scale-[0.99] focus:outline-none focus:ring-0 focus-visible:bg-[#eee] focus-visible:text-[#2f343b] motion-reduce:transition-none motion-reduce:active:scale-100" onClick={() => setIsQuickQaOpen(true)} aria-label="Q&Aチャットを開く" title="Q&Aチャット">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#85827e]" />
          <span>Q&A</span>
        </button>
      </div>
      <QuickQaChatDialog open={isQuickQaOpen} onOpenChange={setIsQuickQaOpen} />
    </>
  );
};



export { WorkspaceActionToolbar };
