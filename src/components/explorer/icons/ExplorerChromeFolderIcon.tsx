import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  variant?: "default" | "large";
};

const ExplorerChromeFolderIconSmall = ({
  size,
  className,
  ...props
}: Omit<ExplorerChromeFolderIconProps, "variant">) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className={cn("shrink-0", className)}
    {...props}
  >
    <path
      d="M3.75 3C3.28587 3 2.84075 3.18437 2.51256 3.51256C2.18437 3.84075 2 4.28587 2 4.75V8.01C2.52239 7.67577 3.12984 7.49875 3.75 7.5H16.25C16.894 7.5 17.495 7.688 18 8.01V6.75C18 6.28587 17.8156 5.84075 17.4874 5.51256C17.1592 5.18437 16.7141 5 16.25 5H11.414C11.3811 5.00006 11.3486 4.99364 11.3182 4.98112C11.2879 4.96859 11.2603 4.9502 11.237 4.927L9.823 3.513C9.49499 3.18476 9.05004 3.00023 8.586 3H3.75ZM3.75 9C3.28587 9 2.84075 9.18437 2.51256 9.51256C2.18437 9.84075 2 10.2859 2 10.75V15.25C2 16.216 2.784 17 3.75 17H16.25C16.7141 17 17.1592 16.8156 17.4874 16.4874C17.8156 16.1592 18 15.7141 18 15.25V10.75C18 10.2859 17.8156 9.84075 17.4874 9.51256C17.1592 9.18437 16.7141 9 16.25 9H3.75Z"
      fill="var(--app-sidebar-icon, #ababab)"
    />
  </svg>
);

const ExplorerChromeFolderIconLarge = ({
  size,
  className,
  ...props
}: Omit<ExplorerChromeFolderIconProps, "variant">) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    className={cn("shrink-0", className)}
    {...props}
  >
    <path
      d="M7.25 19.35C7.25 15.75 10.15 12.85 13.75 12.85H27.05C29.12 12.85 31.06 13.84 32.28 15.51L35.21 19.54H50.25C53.85 19.54 56.75 22.44 56.75 26.04V47.9C56.75 51.5 53.85 54.4 50.25 54.4H13.75C10.15 54.4 7.25 51.5 7.25 47.9V19.35Z"
      fill="var(--explorer-chrome-folder-fill, #f0efe9)"
      stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M9.95 25.88H54.05"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.92"
    />
    <path
      d="M12.15 31.35H51.85"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.42"
    />
    <path
      d="M12.7 18.9H26.72C28.2 18.9 29.58 19.61 30.45 20.79L32.11 23.04"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.58"
    />
  </svg>
);

export const ExplorerChromeFolderIcon = ({
  size = 15,
  variant = "default",
  className,
  ...props
}: ExplorerChromeFolderIconProps) => {
  if (variant === "large") {
    return (
      <ExplorerChromeFolderIconLarge
        size={size}
        className={className}
        {...props}
      />
    );
  }

  return (
    <ExplorerChromeFolderIconSmall
      size={size}
      className={className}
      {...props}
    />
  );
};
