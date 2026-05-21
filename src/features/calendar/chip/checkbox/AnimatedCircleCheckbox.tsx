import {
  AnimatedCalendarCheckboxBase,
  type AnimatedCalendarCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCalendarCheckboxProps = Omit<
  AnimatedCalendarCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCalendarCheckbox = (props: AnimatedCalendarCheckboxProps) => {
  return <AnimatedCalendarCheckboxBase {...props} shape="circle" variant="filled" />;
};