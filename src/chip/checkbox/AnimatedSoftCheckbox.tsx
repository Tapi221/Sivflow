import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";
import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";



type AnimatedSoftCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;



export const AnimatedSoftCheckbox = (props: AnimatedSoftCheckboxProps) => { return <AnimatedCheckboxBase {...props} shape="square" variant="soft" />;
};