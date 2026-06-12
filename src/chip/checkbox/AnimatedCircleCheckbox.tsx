import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";
import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";



type AnimatedCircleCheckboxProps = Omit<AnimatedCheckboxBaseProps, "shape" | "indeterminate">;



const DEFAULT_CIRCLE_CHECKBOX_VARIANT: AnimatedCheckboxBaseProps["variant"] = "filled";



const AnimatedCircleCheckbox = ({ variant = DEFAULT_CIRCLE_CHECKBOX_VARIANT, ...props }: AnimatedCircleCheckboxProps) => {
  return <AnimatedCheckboxBase {...props} shape="circle" variant={variant} />;
};



export { AnimatedCircleCheckbox };
