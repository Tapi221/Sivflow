import type { IconProps } from "@/chip/icons";

//Vuesax-Icons
const CrownIcon = ({ className, label: _label, size: _size, title: _title, ...props }: IconProps) => (<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" {...props} > <path d="M7.3 19H16.7C17.31 19 17.95 18.55 18.16 17.98L22.05 7.08C22.53 5.73 22.2 5.12 21.84 4.86C21.47 4.59 20.81 4.42 19.67 5.24L16.01 7.85C15.48 8.23 14.71 8.02 14.48 7.39L12.72 2.7C12.28 1.53 11.72 1.53 11.28 2.7L9.52 7.39C9.29 8.02 8.52 8.23 7.99 7.85L4.33 5.24C3.19 4.42 2.53 4.59 2.16 4.86C1.8 5.12 1.47 5.73 1.95 7.08L5.84 17.98C6.05 18.55 6.69 19 7.3 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M6.5 22H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M9.5 14H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>);
//Vuesax-Icons
const TriangleIcon = ({ className, label: _label, size: _size, title: _title, ...props }: IconProps) => (<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" {...props} > <path d="M14.67 18.75H9.33C7.45 18.75 6.02 18.07 5.31 16.84C4.6 15.61 4.73 14.03 5.67 12.4L8.34 7.77C9.28 6.15 10.58 5.25 12 5.25C13.42 5.25 14.72 6.15 15.66 7.78L18.33 12.41C19.27 14.04 19.4 15.62 18.69 16.85C17.98 18.07 16.55 18.75 14.67 18.75Z" fill="currentColor" /> </svg>);

export { CrownIcon, TriangleIcon };
