import { AnimatedCalendarCheckboxBase, type AnimatedCalendarCheckboxBaseProps} from "./AnimatedCheckboxBase";

type AnimatedCalendarIndeterminateCheckboxProps = Omit<
  AnimatedCalendarCheckboxBaseProps,
  "shape" | "variant"
>;

export const AnimatedCalendarIndeterminateCheckbox = (
  props: AnimatedCalendarIndeterminateCheckboxProps,
) => {
  return <AnimatedCalendarCheckboxBase {...props} shape="square" variant="filled" />;
};