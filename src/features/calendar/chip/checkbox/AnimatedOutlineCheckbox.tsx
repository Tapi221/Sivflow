import {
  AnimatedCalendarCheckboxBase,
  type AnimatedCalendarCheckboxBaseProps,
} from "./AnimatedCheckboxBase";

type AnimatedCalendarOutlineCheckboxProps = Omit<
  AnimatedCalendarCheckboxBaseProps,
  "shape" | "variant" | "indeterminate"
>;

export const AnimatedCalendarOutlineCheckbox = (props: AnimatedCalendarOutlineCheckboxProps) => {
  return <AnimatedCalendarCheckboxBase {...props} shape="square" variant="outline" />;
};