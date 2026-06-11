interface PositionalRuledLayerProps {
  visibleRules: number[];
  color?: string;
  insetX?: number | string;
  opacity?: number;
}



/**
 * Renders individual ruled lines at specific y positions.
 * Must be inside a `position: relative` container.
 * y positions are relative to the container's top.
 */
const PositionalRuledLayer = ({
  visibleRules,
  color = "rgba(0,0,0,0.05)",
  insetX = 0,
  opacity = 1,
}: PositionalRuledLayerProps) => {
  const left = typeof insetX === "number" ? `${insetX}px` : insetX;
  const right = typeof insetX === "number" ? `${insetX}px` : insetX;

  return visibleRules.map((y) => (
    <div
      key={y}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        top: y,
        left,
        right,
        height: 1,
        background: color,
        opacity,
      }}
    />
  ));
};



export { PositionalRuledLayer };
