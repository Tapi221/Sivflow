import type { AnimatedCheckboxBaseProps } from "@/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@/chip/checkbox/AnimatedCheckboxBase";

type AnimatedSquareCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedSquareCheckbox = (props: AnimatedSquareCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};

export { AnimatedSquareCheckbox };
