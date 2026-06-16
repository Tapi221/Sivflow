import type { AnimatedCheckboxBaseProps } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";

type AnimatedOutlineCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedOutlineCheckbox = (props: AnimatedOutlineCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="outline" />;
};

export { AnimatedOutlineCheckbox };
