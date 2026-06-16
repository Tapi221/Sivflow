import type { AnimatedCheckboxBaseProps } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";

type AnimatedSoftCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedSoftCheckbox = (props: AnimatedSoftCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="soft" />;
};

export { AnimatedSoftCheckbox };
