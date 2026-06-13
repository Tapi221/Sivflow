import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";

type AnimatedSquareCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedSquareCheckbox = (props: AnimatedSquareCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};

export { AnimatedSquareCheckbox };
