import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";

type AnimatedSoftCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedSoftCheckbox = (props: AnimatedSoftCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="soft" />;
};

export { AnimatedSoftCheckbox };
