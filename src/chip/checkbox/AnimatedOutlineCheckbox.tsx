import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";

type AnimatedOutlineCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedOutlineCheckbox = (props: AnimatedOutlineCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="outline" />;
};

export { AnimatedOutlineCheckbox };
