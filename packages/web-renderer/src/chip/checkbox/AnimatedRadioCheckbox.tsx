import type { AnimatedCheckboxBaseProps } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";

type AnimatedRadioCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedRadioCheckbox = (props: AnimatedRadioCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant="radio" />;
};

export { AnimatedRadioCheckbox };
