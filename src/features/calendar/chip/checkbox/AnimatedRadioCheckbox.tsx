import {
  AnimatedCalendarCheckboxBase,
  type AnimatedCalendarCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCalendarRadioCheckboxProps = Omit<
  AnimatedCalendarCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCalendarRadioCheckbox = (props: AnimatedCalendarRadioCheckboxProps) => {
  return <AnimatedCalendarCheckboxBase {...props} shape="circle" variant="radio" />;
};