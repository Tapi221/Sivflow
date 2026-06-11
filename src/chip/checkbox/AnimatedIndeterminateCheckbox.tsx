import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";
import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";



type AnimatedIndeterminateCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant"
>;



const AnimatedIndeterminateCheckbox = (props: AnimatedIndeterminateCheckboxProps) => { return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};



export { AnimatedIndeterminateCheckbox };
