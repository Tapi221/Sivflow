import type { DraggableStyle } from "@hello-pangea/dnd";

export const lockToVerticalTransform = (style?: DraggableStyle): DraggableStyle | undefined => {
  if (!style?.transform) return style;

  let t = style.transform;

  // translate3d(x, y, z) の x を 0 に
  t = t.replace(
    /translate3d\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    (_m, _x, y, z) => `translate3d(0px, ${y}, ${z})`
  );

  // translate(x, y) の x を 0 に
  t = t.replace(
    /translate\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    (_m, _x, y) => `translate(0px, ${y})`
  );

  // translateX(x) を 0 に（保険）
  t = t.replace(
    /translateX\(\s*([^)]+)\s*\)/g,
    () => `translateX(0px)`
  );

  return { ...style, transform: t };
};
