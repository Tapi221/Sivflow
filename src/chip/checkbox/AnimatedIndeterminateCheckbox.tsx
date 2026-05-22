import { AnimatedCheckboxBase, type AnimatedCheckboxBaseProps} from "./AnimatedCheckboxBase";

type AnimatedIndeterminateCheckboxProps = Omit<
  AnimatedCheckboxBaseProps,
  "shape" | "variant"
>;

export const AnimatedIndeterminateCheckbox = (
  props: AnimatedIndeterminateCheckboxProps,
) => {
  return <AnimatedCheckboxBase {...props} shape="square" variant="filled" />;
};