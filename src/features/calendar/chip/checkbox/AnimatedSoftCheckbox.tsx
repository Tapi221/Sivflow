import {
  AnimatedCalendarCheckboxBase,
  type AnimatedCalendarCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCalendarSoftCheckboxProps = Omit<
  AnimatedCalendarCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCalendarSoftCheckbox = (props: AnimatedCalendarSoftCheckboxProps) => {
  return <AnimatedCalendarCheckboxBase {...props} shape="square" variant="soft" />;
};