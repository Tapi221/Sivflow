import type { AnimatedCheckboxBaseProps } from "@/chip/checkbox/AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "@/chip/checkbox/AnimatedCheckboxBase";

type AnimatedSoftCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedSoftCheckbox = (props: AnimatedSoftCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="soft" />;
};

export { AnimatedSoftCheckbox };
