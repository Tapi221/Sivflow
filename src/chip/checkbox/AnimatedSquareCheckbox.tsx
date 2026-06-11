import { AnimatedCheckboxBase } from "./AnimatedCheckboxBase";
import type { AnimatedCheckboxBaseProps } from "./AnimatedCheckboxBase";

type AnimatedSquareCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

const AnimatedSquareCheckbox = (props: AnimatedSquareCheckboxProps) => { return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};

export { AnimatedSquareCheckbox };
