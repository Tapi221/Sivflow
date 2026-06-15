import type { AnimatedCheckboxBaseProps } from "@/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@/chip/checkbox/AnimatedCheckboxBase";

type AnimatedOutlineCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedOutlineCheckbox = (props: AnimatedOutlineCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="outline" />;
};

export { AnimatedOutlineCheckbox };
