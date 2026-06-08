import type { ReactNode, SVGProps } from "react";
import type { IconProps } from "@/ui/icons";

type SidebarIconProps = SVGProps<SVGSVGElement>;

type IconShellProps = SidebarIconProps & {
  children: ReactNode;
};

//IOS
export const SidebarOpenIcon = ({
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
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M8 4V20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5.5 8H6.5M5.5 11H6.5M5.5 14H6.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IconShell = ({ children, className, ...props }: IconShellProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const ClockIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
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
  </IconShell>
);

export const SettingIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
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
  </IconShell>
);

export const HomeIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
    <path
      d="M20 8.5V13.5C20 17.271 20 19.157 18.828 20.328C17.656 21.499 15.771 21.5 12 21.5C8.229 21.5 6.343 21.5 5.172 20.328C4.001 19.156 4 17.271 4 13.5V8.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 10.5L17.657 6.335C14.99 3.778 13.657 2.5 12 2.5C10.343 2.5 9.01 3.778 6.343 6.335L2 10.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconShell>
);

export const InboxIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
    <path
      d="M5 7h14l1.5 10H15l-1.3 2h-3.4L9 17H3.5L5 7Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </IconShell>
);

export const CalendarIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
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
  </IconShell>
);

export const LibraryIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
    <path
      d="M4 9.25C4 8.007 5.007 7 6.25 7H8.85C9.422 7 9.972 7.218 10.389 7.61L11.235 8.406C11.514 8.669 11.884 8.815 12.267 8.815H17.75C18.993 8.815 20 9.822 20 11.065V16.75C20 17.993 18.993 19 17.75 19H6.25C5.007 19 4 17.993 4 16.75V9.25Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.25 11H19.75"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconShell>
);

export const GalleryIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
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
  </IconShell>
);

export const ExploreIcon = ({ className, ...props }: SidebarIconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 12.41 22.41 12.75 22 12.75C21.59 12.75 21.25 12.41 21.25 12C21.25 6.9 17.1 2.75 12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C12.41 21.25 12.75 21.59 12.75 22C12.75 22.41 12.41 22.75 12 22.75Z" />
    <path d="M9.00024 21.75H8.00024C7.59024 21.75 7.25024 21.41 7.25024 21C7.25024 20.59 7.57023 20.26 7.98023 20.25C6.41023 14.89 6.41023 9.11 7.98023 3.75C7.58023 3.74 7.25024 3.41 7.25024 3C7.25024 2.59 7.59024 2.25 8.00024 2.25H9.00024C9.24024 2.25 9.47024 2.37 9.61024 2.56C9.75024 2.76 9.79025 3.00999 9.71025 3.23999C7.83025 8.88999 7.83025 15.12 9.71025 20.77C9.79025 21 9.75024 21.25 9.61024 21.45C9.47024 21.65 9.24024 21.75 9.00024 21.75Z" />
    <path d="M16.46 12.75C16.05 12.75 15.71 12.41 15.71 12C15.71 9.01996 15.2299 6.06995 14.2899 3.23995C14.1599 2.84995 14.3699 2.41994 14.7599 2.28994C15.1499 2.15994 15.58 2.36997 15.71 2.75997C16.7 5.73997 17.21 8.84996 17.21 12C17.21 12.41 16.87 12.75 16.46 12.75Z" />
    <path d="M12 17.2098C9.2 17.2098 6.43 16.8098 3.75 16.0198C3.74 16.4198 3.41 16.7498 3 16.7498C2.59 16.7498 2.25 16.4098 2.25 15.9998V14.9998C2.25 14.7598 2.37 14.5298 2.56 14.3898C2.76 14.2498 3.01001 14.2098 3.24001 14.2898C6.07001 15.2298 9.02 15.7098 12 15.7098C12.41 15.7098 12.75 16.0498 12.75 16.4598C12.75 16.8698 12.41 17.2098 12 17.2098Z" />
    <path d="M21.0002 9.74989C20.9202 9.74989 20.8402 9.73991 20.7602 9.70991C15.1102 7.82991 8.88018 7.82991 3.23018 9.70991C2.84018 9.83991 2.41018 9.62988 2.28018 9.23988C2.15018 8.84988 2.36018 8.41986 2.75018 8.28986C8.71018 6.29986 15.2702 6.29986 21.2202 8.28986C21.6102 8.41986 21.8202 8.84988 21.6902 9.23988C21.6102 9.54988 21.3102 9.74989 21.0002 9.74989Z" />
    <path d="M18.2 22.15C16.02 22.15 14.25 20.38 14.25 18.2C14.25 16.02 16.02 14.25 18.2 14.25C20.38 14.25 22.15 16.02 22.15 18.2C22.15 20.38 20.38 22.15 18.2 22.15ZM18.2 15.75C16.85 15.75 15.75 16.85 15.75 18.2C15.75 19.55 16.85 20.65 18.2 20.65C19.55 20.65 20.65 19.55 20.65 18.2C20.65 16.85 19.55 15.75 18.2 15.75Z" />
    <path d="M21.9999 22.75C21.8099 22.75 21.6199 22.68 21.4699 22.53L20.4699 21.53C20.1799 21.24 20.1799 20.7599 20.4699 20.4699C20.7599 20.1799 21.2399 20.1799 21.5299 20.4699L22.5299 21.4699C22.8199 21.7599 22.8199 22.24 22.5299 22.53C22.3799 22.68 22.1899 22.75 21.9999 22.75Z" />
  </svg>
);

export const CloudIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
    <path
      d="M7.5 17.5h9.3a3.2 3.2 0 0 0 .3-6.4A5.4 5.4 0 0 0 6.8 9.8 3.9 3.9 0 0 0 7.5 17.5Z"
      fill="currentColor"
      opacity="0.45"
    />
    <path
      d="M12 9.5v5M9.8 11.7 12 9.5l2.2 2.2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </IconShell>
);

export const ChevronDownIcon = ({ className, ...props }: SidebarIconProps) => (
  <IconShell className={className} {...props}>
    <path
      d="m8 10 4 4 4-4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </IconShell>
);
