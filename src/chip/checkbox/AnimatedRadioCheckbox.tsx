import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";
import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";

type AnimatedRadioCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedRadioCheckbox = (props: AnimatedRadioCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant="radio" />;
};

export { AnimatedRadioCheckbox };
