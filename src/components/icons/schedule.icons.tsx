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
      fill="currentColor"
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
      fill="currentColor"
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
      fill="currentColor"
    />
  </svg>
);

//Animated navigation bar
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

//Vuesax-Icons
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

//Animated navigation bar
export const PlusLineIcon = ({
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
      d="M12 4V20M4 12H20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
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

//自作
export const CheckSquareFilledIcon = ({
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
    <rect width="20" height="20" rx="4" fill="currentColor" />
    <path
      d="M8.4 12.35L5.95 9.9C5.76667 9.71667 5.53333 9.625 5.25 9.625C4.96667 9.625 4.73333 9.71667 4.55 9.9C4.36667 10.0833 4.275 10.3167 4.275 10.6C4.275 10.8833 4.36667 11.1167 4.55 11.3L7.7 14.45C7.9 14.65 8.13333 14.75 8.4 14.75C8.66667 14.75 8.9 14.65 9.1 14.45L15.45 8.1C15.6333 7.91667 15.725 7.68333 15.725 7.4C15.725 7.11667 15.6333 6.88333 15.45 6.7C15.2667 6.51667 15.0333 6.425 14.75 6.425C14.4667 6.425 14.2333 6.51667 14.05 6.7L8.4 12.35Z"
      fill="white"
    />
  </svg>
);

//自作
export const SquareOutlineIcon = ({
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
      d="M6 22C4.9 22 3.95833 21.6083 3.175 20.825C2.39167 20.0417 2 19.1 2 18V6C2 4.9 2.39167 3.95833 3.175 3.175C3.95833 2.39167 4.9 2 6 2H18C19.1 2 20.0417 2.39167 20.825 3.175C21.6083 3.95833 22 4.9 22 6V18C22 19.1 21.6083 20.0417 20.825 20.825C20.0417 21.6083 19.1 22 18 22H6ZM6 20H18C18.55 20 19.0208 19.8042 19.4125 19.4125C19.8042 19.0208 20 18.55 20 18V6C20 5.45 19.8042 4.97917 19.4125 4.5875C19.0208 4.19583 18.55 4 18 4H6C5.45 4 4.97917 4.19583 4.5875 4.5875C4.19583 4.97917 4 5.45 4 6V18C4 18.55 4.19583 19.0208 4.5875 19.4125C4.97917 19.8042 5.45 20 6 20Z"
      fill="currentColor"
    />
  </svg>
);


//Animated navigation bar
export const SettingIcon = ({
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
      d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.43 12.98C19.47 12.66 19.5 12.34 19.5 12C19.5 11.66 19.48 11.33 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.28 4.96 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.86 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.14 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.72 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.52 11.34 4.5 11.67 4.5 12C4.5 12.33 4.52 12.66 4.57 12.98L2.46 14.63C2.27 14.78 2.22 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.72 19.04 4.95 18.95L7.44 17.95C7.96 18.35 8.52 18.68 9.14 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.86 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

//Animated navigation bar
export const GalleryIcon = ({
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
      d="M9 4.5C5.504 5.701 3 8.942 3 12.751C3 13.958 3.251 15.108 3.706 16.153M15 4.5C18.496 5.701 21 8.942 21 12.751C21 13.774 20.82 14.755 20.488 15.667M16.5 20.33C15.1256 21.1005 13.5757 21.5035 12 21.5C10.4243 21.5035 8.8744 21.1005 7.5 20.33M15 5C15 5.79565 14.6839 6.55871 14.1213 7.12132C13.5587 7.68393 12.7956 8 12 8C11.2044 8 10.4413 7.68393 9.87868 7.12132C9.31607 6.55871 9 5.79565 9 5C9 4.20435 9.31607 3.44129 9.87868 2.87868C10.4413 2.31607 11.2044 2 12 2C12.7956 2 13.5587 2.31607 14.1213 2.87868C14.6839 3.44129 15 4.20435 15 5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 22C6.65685 22 8 20.6569 8 19C8 17.3431 6.65685 16 5 16C3.34315 16 2 17.3431 2 19C2 20.6569 3.34315 22 5 22Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 22C20.6569 22 22 20.6569 22 19C22 17.3431 20.6569 16 19 16C17.3431 16 16 17.3431 16 19C16 20.6569 17.3431 22 19 22Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);