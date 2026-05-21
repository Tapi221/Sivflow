import {
  AnimatedCheckboxBase,
  type AnimatedCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedSquareCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedSquareCheckbox = (props: AnimatedSquareCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};