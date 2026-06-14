const overlayGlassToolbarClassName = "pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-[#d9e0e8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,249,252,0.94)_100%)] px-2.5 py-1 text-[#66758a] shadow-[0_10px_26px_rgba(31,41,55,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-[14px]";
const overlayGlassPillClassName = "pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-2xl border border-[#d9e0e8] bg-[rgba(247,249,252,0.94)] px-3 text-xs font-medium text-[#1f2937] shadow-[0_8px_20px_rgba(31,41,55,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-[14px]";
const overlayGlassIconButtonClassName = "pointer-events-auto grid h-8 w-8 place-items-center rounded-xl border border-[#d9e0e8] bg-[rgba(247,249,252,0.88)] text-[#66758a] shadow-[0_4px_12px_rgba(31,41,55,0.05),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-[14px] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#c9d3de] hover:bg-[#f5f9fe] hover:text-[#1f2937]";
const overlayGlassActionButtonActiveClassName = "border-[#c9d3de] bg-[#e8f1fd] text-[#1f2937] shadow-[inset_0_0_0_1px_rgba(79,141,247,0.18),0_1px_2px_rgba(31,41,55,0.05)]";
const overlayGlassActionButtonDisabledClassName = "border-transparent bg-transparent text-[#aeb8c5] hover:bg-transparent hover:text-[#aeb8c5]";
const overlayGlassActionButtonClassName = "grid h-7 w-7 place-items-center rounded-xl border border-transparent bg-transparent text-[#66758a] shadow-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:border-[#d9e0e8] hover:bg-[#f5f9fe] hover:text-[#1f2937] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45";



export { overlayGlassToolbarClassName, overlayGlassPillClassName, overlayGlassIconButtonClassName, overlayGlassActionButtonActiveClassName, overlayGlassActionButtonDisabledClassName, overlayGlassActionButtonClassName };
