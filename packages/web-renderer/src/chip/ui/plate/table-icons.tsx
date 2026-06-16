"use client";

import type { LucideProps } from "lucide-react";

const BorderAllIcon = (props: LucideProps) => {
  return (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Border All</title>
      <path d="M1 1h13v13H1zM7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};
const BorderBottomIcon = (props: LucideProps) => {
  return (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Border Bottom</title>
      <path d="M1 14h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};
const BorderLeftIcon = (props: LucideProps) => {
  return (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Border Left</title>
      <path d="M1 1v13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};
const BorderNoneIcon = (props: LucideProps) => {
  return (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Border None</title>
      <path d="M3 3h1M7 3h1M11 3h1M3 7h1M7 7h1M11 7h1M3 11h1M7 11h1M11 11h1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};
const BorderRightIcon = (props: LucideProps) => {
  return (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Border Right</title>
      <path d="M14 1v13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};
const BorderTopIcon = (props: LucideProps) => {
  return (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Border Top</title>
      <path d="M1 1h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

export { BorderAllIcon, BorderBottomIcon, BorderLeftIcon, BorderNoneIcon, BorderRightIcon, BorderTopIcon };
