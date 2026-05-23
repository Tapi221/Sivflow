//Vuesax-Icons
export const FlagIcon = ({
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
      d="M6.5 22V2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 17L15.4 12.6C17.2 11.7 18.1 10.5 18 10C17.9 9.2 17.1 8.5 15.4 7.8L6.5 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);