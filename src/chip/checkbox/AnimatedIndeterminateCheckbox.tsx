import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";



type AnimatedIndeterminateCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant"
>;



const AnimatedIndeterminateCheckbox = (props: AnimatedIndeterminateCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};



export { AnimatedIndeterminateCheckbox };
