import {
  AnimatedCheckboxBase,
  type AnimatedCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCircleCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCircleCheckbox = (props: AnimatedCircleCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant="filled" />;
};