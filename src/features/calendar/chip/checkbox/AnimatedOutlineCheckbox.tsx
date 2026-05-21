import {
  AnimatedCheckboxBase,
  type AnimatedCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedOutlineCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedOutlineCheckbox = (props: AnimatedOutlineCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="outline" />;
};