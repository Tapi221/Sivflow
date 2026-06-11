import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";
import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";



type AnimatedRadioCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;



export const AnimatedRadioCheckbox = (props: AnimatedRadioCheckboxProps) => { return <AnimatedCheckboxBase {...props} shape="circle" variant="radio" />;
};