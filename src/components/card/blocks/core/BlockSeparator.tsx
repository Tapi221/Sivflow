import { RuledLayer } from "@/components/card/frame/RuledLayer";

const BlockSeparator = () => (<div aria-hidden className="pointer-events-none relative h-[9px] w-full"> <RuledLayer kind="bottom-only" ruledBottomOffsetPx={4} /> </div>);

export { BlockSeparator };
