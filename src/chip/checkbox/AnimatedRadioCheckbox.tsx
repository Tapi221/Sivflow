import type { AnimatedCheckboxBaseProps } from "@/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@/chip/checkbox/AnimatedCheckboxBase";

type AnimatedRadioCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedRadioCheckbox = (props: AnimatedRadioCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant="radio" />;
};

export { AnimatedRadioCheckbox };
