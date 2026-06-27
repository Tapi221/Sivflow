import { RuledLayer } from "@web-renderer/components/card/frame/RuledLayer";



const BlockSeparator = () => (<div aria-hidden className="pointer-events-none relative h-2 w-full"> <RuledLayer kind="bottom-only" ruledBottomOffsetPx={4} /> </div>);



export { BlockSeparator };
