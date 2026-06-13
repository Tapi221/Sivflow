import type { AnimatedCheckboxBaseProps } from "@/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@/chip/checkbox/AnimatedCheckboxBase";

type AnimatedIndeterminateCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant"
>;

const AnimatedIndeterminateCheckbox = (props: AnimatedIndeterminateCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};

export { AnimatedIndeterminateCheckbox };
