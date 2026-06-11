import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";



type AnimatedRadioCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;



const AnimatedRadioCheckbox = (props: AnimatedRadioCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant="radio" />;
};



export { AnimatedRadioCheckbox };
