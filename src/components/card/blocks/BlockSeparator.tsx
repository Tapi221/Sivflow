import { RuledLayer } from "@/components/card/frame/RuledLayer";

export function BlockSeparator() {
  return (
    <div aria-hidden className="pointer-events-none relative h-[9px] w-full">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2">
        <RuledLayer kind="bottom-only" />
      </div>
    </div>
  );
}