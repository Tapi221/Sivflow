import {
  AnimatedCheckboxBase,
  type AnimatedCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCheckbox = (props: AnimatedCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant="filled" />;
};