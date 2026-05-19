import type { IconProps } from "@/ui/icons";

export const TimelineToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 3H11C11.5523 3 12 3.44772 12 4V5C12 5.55228 11.5523 6 11 6H2C1.44772 6 1 5.55228 1 5V4C1 3.44772 1.44772 3 2 3ZM0 4C0 2.89543 0.895431 2 2 2H11C12.1046 2 13 2.89543 13 4V5C13 6.10457 12.1046 7 11 7H2C0.89543 7 0 6.10457 0 5V4ZM5 10H14C14.5523 10 15 10.4477 15 11V12C15 12.5523 14.5523 13 14 13H5C4.44772 13 4 12.5523 4 12V11C4 10.4477 4.44772 10 5 10ZM3 11C3 9.89543 3.89543 9 5 9H14C15.1046 9 16 9.89543 16 11V12C16 13.1046 15.1046 14 14 14H5C3.89543 14 3 13.1046 3 12V11Z"
      fill="#74798B"
    />
  </svg>
);

export const SortToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9337 5.49595L8.00095 2.125L4.06817 5.49595C3.78932 5.73497 3.75703 6.15478 3.99604 6.43363C4.23506 6.71248 4.65487 6.74478 4.93373 6.50576L8.00095 3.87671L11.0682 6.50576C11.347 6.74478 11.7668 6.71248 12.0059 6.43363C12.2449 6.15478 12.2126 5.73497 11.9337 5.49595ZM4.06823 10.506L8.001 13.877L11.9338 10.506C12.2126 10.267 12.2449 9.84717 12.0059 9.56832C11.7669 9.28947 11.3471 9.25717 11.0682 9.49619L8.001 12.1252L4.93378 9.49619C4.65493 9.25717 4.23511 9.28947 3.9961 9.56832C3.75708 9.84717 3.78938 10.267 4.06823 10.506Z"
      fill="#8F929C"
    />
  </svg>
);

export const FieldsToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.00094 3.33594C1.63367 3.33594 1.33594 3.63367 1.33594 4.00094C1.33594 4.36821 1.63367 4.66594 2.00094 4.66594H2.0076C2.37487 4.66594 2.6726 4.36821 2.6726 4.00094C2.6726 3.63367 2.37487 3.33594 2.0076 3.33594H2.00094ZM5.33443 3.33594C4.96716 3.33594 4.66943 3.63367 4.66943 4.00094C4.66943 4.36821 4.96716 4.66594 5.33443 4.66594H14.0011C14.3684 4.66594 14.6661 4.36821 14.6661 4.00094C14.6661 3.63367 14.3684 3.33594 14.0011 3.33594H5.33443ZM5.33443 7.33594C4.96716 7.33594 4.66943 7.63367 4.66943 8.00094C4.66943 8.36821 4.96716 8.66594 5.33443 8.66594H14.0011C14.3684 8.66594 14.6661 8.36821 14.6661 8.00094C14.6661 7.63367 14.3684 7.33594 14.0011 7.33594H5.33443ZM4.66943 12.0009C4.66943 11.6337 4.96716 11.3359 5.33443 11.3359H14.0011C14.3684 11.3359 14.6661 11.6337 14.6661 12.0009C14.6661 12.3682 14.3684 12.6659 14.0011 12.6659H5.33443C4.96716 12.6659 4.66943 12.3682 4.66943 12.0009ZM1.33594 8.00094C1.33594 7.63367 1.63367 7.33594 2.00094 7.33594H2.0076C2.37487 7.33594 2.6726 7.63367 2.6726 8.00094C2.6726 8.36821 2.37487 8.66594 2.0076 8.66594H2.00094C1.63367 8.66594 1.33594 8.36821 1.33594 8.00094ZM2.00094 11.3359C1.63367 11.3359 1.33594 11.6337 1.33594 12.0009C1.33594 12.3682 1.63367 12.6659 2.00094 12.6659H2.0076C2.37487 12.6659 2.6726 12.3682 2.6726 12.0009C2.6726 11.6337 2.37487 11.3359 2.0076 11.3359H2.00094Z"
      fill="#74798B"
    />
  </svg>
);

export const MonthViewIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

export const WeekViewIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M16 2v4" />
    <path d="M3 10h18" />
    <path d="M8 2v4" />
    <path d="M17 14h-6" />
    <path d="M13 18H7" />
    <path d="M7 14h.01" />
    <path d="M17 18h.01" />
  </svg>
);

export const DayViewIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

export const CalendarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M18 2V4M6 2V4M10 17V13.347C10 13.156 9.863 13 9.695 13H9M13.63 17L14.984 13.35C15.047 13.179 14.913 13 14.721 13H13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 8H18M2.5 12.243C2.5 7.886 2.5 5.707 3.752 4.353C5.004 3 7.02 3 11.05 3H12.95C16.98 3 18.996 3 20.248 4.354C21.5 5.707 21.5 7.886 21.5 12.244V12.757C21.5 17.114 21.5 19.293 20.248 20.647C18.996 22 16.98 22 12.95 22H11.05C7.02 22 5.004 22 3.752 20.646C2.5 19.293 2.5 17.114 2.5 12.756V12.243Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

//https://www.figma.com/design/Ut6x9ZMV1go2L7nyP9y0U9/Vuesax-Icons--Community-?node-id=201-7665&m=dev
export const TaskIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />

    <path
      d="M8 12.2L10.5 14.7L16 9.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SidebarPanelIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="2"
      y="2.75"
      width="12"
      height="10.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M6 3V13"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

//https://www.figma.com/design/Ut6x9ZMV1go2L7nyP9y0U9/Vuesax-Icons--Community-?node-id=201-7672&m=dev
export const PlusIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M18 12.75H6C5.59 12.75 5.25 12.41 5.25 12C5.25 11.59 5.59 11.25 6 11.25H18C18.41 11.25 18.75 11.59 18.75 12C18.75 12.41 18.41 12.75 18 12.75Z"
      fill="currentColor"
    />
    <path
      d="M12 18.75C11.59 18.75 11.25 18.41 11.25 18V6C11.25 5.59 11.59 5.25 12 5.25C12.41 5.25 12.75 5.59 12.75 6V18C12.75 18.41 12.41 18.75 12 18.75Z"
      fill="currentColor"
    />
  </svg>
);

//Vuesax-Icons
export const FilterIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M10.94 22.65C10.46 22.65 9.99002 22.53 9.55002 22.29C8.67002 21.8 8.14002 20.91 8.14002 19.91V14.61C8.14002 14.11 7.81002 13.36 7.50002 12.98L3.76002 9.02001C3.13002 8.39001 2.65002 7.31001 2.65002 6.50001V4.20001C2.65002 2.60001 3.86002 1.35001 5.40002 1.35001H18.6C20.12 1.35001 21.35 2.58001 21.35 4.10001V6.30001C21.35 7.35001 20.72 8.54001 20.13 9.13001L15.8 12.96C15.38 13.31 15.05 14.08 15.05 14.7V19C15.05 19.89 14.49 20.92 13.79 21.34L12.41 22.23C11.96 22.51 11.45 22.65 10.94 22.65Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M5.99998 10.75C5.85998 10.75 5.72998 10.71 5.59998 10.64C5.24998 10.42 5.13998 9.94999 5.35998 9.59999L10.29 1.69999C10.51 1.34999 10.97 1.23999 11.32 1.45999C11.67 1.67999 11.78 2.13999 11.56 2.48999L6.62998 10.39C6.48998 10.62 6.24998 10.75 5.99998 10.75Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

//Vuesax-Icons
export const SearchIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M11.5 21.75C5.85 21.75 1.25 17.15 1.25 11.5C1.25 5.85 5.85 1.25 11.5 1.25C17.15 1.25 21.75 5.85 21.75 11.5C21.75 17.15 17.15 21.75 11.5 21.75Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M22 22.75L19.47 20.53"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

//使うやつ
export const CheckCircleFilledIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M8.6 11.8L6.45 9.65C6.26667 9.46667 6.03333 9.375 5.75 9.375C5.46667 9.375 5.23333 9.46667 5.05 9.65C4.86667 9.83333 4.775 10.0667 4.775 10.35C4.775 10.6333 4.86667 10.8667 5.05 11.05L7.9 13.9C8.1 14.1 8.33333 14.2 8.6 14.2C8.86667 14.2 9.1 14.1 9.3 13.9L14.95 8.25C15.1333 8.06667 15.225 7.83333 15.225 7.55C15.225 7.26667 15.1333 7.03333 14.95 6.85C14.7667 6.66667 14.5333 6.575 14.25 6.575C13.9667 6.575 13.7333 6.66667 13.55 6.85L8.6 11.8ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
      fill="currentColor"
    />
  </svg>
);

//使うやつ
export const CircleOutlineIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22ZM12 20C14.2333 20 16.125 19.225 17.675 17.675C19.225 16.125 20 14.2333 20 12C20 9.76667 19.225 7.875 17.675 6.325C16.125 4.775 14.2333 4 12 4C9.76667 4 7.875 4.775 6.325 6.325C4.775 7.875 4 9.76667 4 12C4 14.2333 4.775 16.125 6.325 17.675C7.875 19.225 9.76667 20 12 20Z"
      fill="currentColor"
    />
  </svg>
);

//Vuesax-Icons
export const IosIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M9.23005 22.75C9.22005 22.75 9.21005 22.75 9.19005 22.75C7.51005 22.74 6.31005 21.23 5.46005 19.92C3.29005 16.59 2.85005 12.4 4.42005 9.97001C5.47005 8.34 7.17005 7.32999 8.85005 7.32999C9.72005 7.32999 10.4001 7.57001 11.0001 7.79001C11.4801 7.96001 11.89 8.10999 12.32 8.10999C12.7 8.10999 13.03 7.98001 13.45 7.82001C14.03 7.60001 14.74 7.32999 15.77 7.32999C17.25 7.32999 18.7701 8.12 19.8301 9.46C19.9701 9.63 20.0201 9.86001 19.9801 10.07C19.9401 10.29 19.8001 10.47 19.6101 10.58C18.4801 11.2 17.86 12.33 17.95 13.61C18.04 14.91 18.8401 16.01 20.0401 16.46C20.2301 16.53 20.3901 16.68 20.4701 16.87C20.5501 17.06 20.55 17.28 20.46 17.46C20.02 18.44 19.8001 18.89 19.2301 19.77C18.2801 21.23 17.0801 22.73 15.4401 22.75C14.7301 22.75 14.2501 22.54 13.8301 22.34C13.4101 22.15 13 22 12.35 21.98C11.65 21.98 11.28 22.15 10.85 22.34C10.41 22.54 9.93005 22.75 9.23005 22.75Z"
      fill="currentColor"
    />
  </svg>
);

//Vuesax-Icons
export const GoogleIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12.1999 22.75C8.15994 22.75 4.51994 20.52 2.65994 16.93C2.62994 16.9 2.60994 16.86 2.58994 16.82C1.82994 15.3 1.43994 13.68 1.43994 12C1.43994 10.32 1.82994 8.69999 2.58994 7.17999C4.42994 3.51999 8.10994 1.25 12.1899 1.25C14.9299 1.25 17.4199 2.21999 19.3899 4.04999C19.5399 4.18999 19.6299 4.38 19.6299 4.59C19.6299 4.8 19.5499 4.99001 19.3999 5.14001L16.5799 7.89999C16.2899 8.17999 15.8399 8.19 15.5399 7.91C14.9099 7.32 13.8199 6.62 12.1899 6.62C10.1299 6.62 8.23994 7.86001 7.38994 9.79001C7.31994 9.95001 7.25994 10.1 7.19994 10.27C7.00994 10.85 6.91994 11.44 6.91994 12.01C6.91994 12.58 7.01994 13.15 7.19994 13.72C7.19994 13.73 7.20994 13.74 7.20994 13.76C7.92994 15.94 9.92994 17.4 12.1899 17.4C13.3799 17.4 14.3999 17.11 15.2299 16.53C15.9899 16 16.4699 15.29 16.7299 14.65H12.1999C11.7899 14.65 11.4499 14.31 11.4499 13.9V10.19C11.4499 9.78 11.7899 9.44 12.1999 9.44H21.5899C21.9399 9.44 22.2399 9.67999 22.3199 10.02C22.4799 10.72 22.5499 11.38 22.5499 12.23C22.5499 15.41 21.4099 18.22 19.3299 20.14C17.4799 21.84 15.0099 22.75 12.1999 22.75Z"
      fill="currentColor"
    />
  </svg>
);