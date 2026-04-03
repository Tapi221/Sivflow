import { RuledLayer } from "@/components/card/frame/RuledLayer";

export const BlockSeparator = () => (
  <div aria-hidden className="pointer-events-none relative h-[9px] w-full">
    <RuledLayer kind="bottom-only" ruledBottomOffsetPx={4} />
  </div>
);