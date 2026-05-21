import {
  AnimatedCalendarCheckboxBase,
  type AnimatedCalendarCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCalendarSquareCheckboxProps = Omit<
  AnimatedCalendarCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCalendarSquareCheckbox = (props: AnimatedCalendarSquareCheckboxProps) => {
  return <AnimatedCalendarCheckboxBase {...props} shape="square" variant="filled" />;
};