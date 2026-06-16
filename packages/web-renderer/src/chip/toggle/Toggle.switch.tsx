import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties, HTMLAttributes, ReactNode } from "react";



type ToggleSwitchProps = Omit<HTMLAttributes<HTMLLabelElement>, "onChange"> & {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
  /**
   * The height of the switch, including the padding.
   */
  size?: number;
  /**
   * The padding of the switch.
   */
  padding?: number;
};
type ToggleSwitchStyles = {
  label: CSSProperties;
  input: CSSProperties;
  switchTrack: CSSProperties;
  switchThumb: CSSProperties;
};



const DEFAULT_SWITCH_SIZE = 26;
const DEFAULT_SWITCH_PADDING = 3;
const SWITCH_GAP = 10;
const SWITCH_BORDER_RADIUS = 37;
const SWITCH_TRANSITION = "200ms all";
const SWITCH_THUMB_TRANSITION = "all .2s cubic-bezier(0.27, 0.2, 0.25, 1.51)";
const SWITCH_DISABLED_BACKGROUND_COLOR = "var(--toggle-disable-background-color, #d9d9d6)";
const SWITCH_CIRCLE_BACKGROUND_COLOR = "var(--toggle-circle-background-color, #fff)";
const SWITCH_CHECKED_BACKGROUND_COLOR = "var(--toggle-checked-background-color, var(--ds-semantic-color-action-accent, var(--primary-color, #1e96eb)))";



const createToggleSwitchStyles = ({
  checked,
  disabled,
  padding,
  size,
  style,
}: {
  checked: boolean;
  disabled: boolean | undefined;
  padding: number;
  size: number;
  style: CSSProperties | undefined;
}): ToggleSwitchStyles => {
  const switchWidth = (size - padding) * 2;
  const dotSize = size - padding * 2;
  const thumbTranslateX = checked ? size - padding : padding;
  return {
    label: {
      display: "flex",
      alignItems: "center",
      gap: SWITCH_GAP,
      cursor: "pointer",
      ...style,
    },
    input: {
      opacity: 0,
      position: "absolute",
    },
    switchTrack: {
      position: "relative",
      height: size,
      width: switchWidth,
      background: checked ? SWITCH_CHECKED_BACKGROUND_COLOR : SWITCH_DISABLED_BACKGROUND_COLOR,
      borderRadius: SWITCH_BORDER_RADIUS,
      transition: SWITCH_TRANSITION,
      cursor: disabled ? "not-allowed" : undefined,
      opacity: disabled ? 0.5 : undefined,
    },
    switchThumb: {
      transition: SWITCH_THUMB_TRANSITION,
      position: "absolute",
      width: dotSize,
      height: dotSize,
      borderRadius: "50%",
      top: "50%",
      background: SWITCH_CIRCLE_BACKGROUND_COLOR,
      transform: `translate(${thumbTranslateX}px, -50%)`,
    },
  };
};



const ToggleSwitch = ({
  checked: checkedProp = false,
  onChange: onChangeProp,
  children,
  className,
  disabled,
  style,
  size: propsSize,
  padding: propsPadding,
  ...otherProps
}: ToggleSwitchProps) => {
  const size = propsSize ?? DEFAULT_SWITCH_SIZE;
  const padding = propsPadding ?? DEFAULT_SWITCH_PADDING;
  const [checkedState, setCheckedState] = useState(checkedProp);
  const checked = onChangeProp ? checkedProp : checkedState;
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      const newChecked = event.target.checked;
      if (onChangeProp) {
        onChangeProp(newChecked);
      } else {
        setCheckedState(newChecked);
      }
    },
    [disabled, onChangeProp],
  );
  const switchStyles = useMemo(
    () => createToggleSwitchStyles({
      checked,
      disabled,
      padding,
      size,
      style,
    }),
    [checked, disabled, padding, size, style],
  );
  return (
    <label
      className={className}
      style={switchStyles.label}
      {...otherProps}
    >
      {children}
      <input
        style={switchStyles.input}
        type="checkbox"
        value={checked ? "on" : "off"}
        checked={checked}
        onChange={onChange}
      />
      <span style={switchStyles.switchTrack}>
        <span style={switchStyles.switchThumb} />
      </span>
    </label>
  );
};



export { ToggleSwitch };


export type { ToggleSwitchProps };
