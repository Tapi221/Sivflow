import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "@/ui/icons";

const Pagination = ({
  className,
  ...props
}: React.ComponentProps<"nav">) => {
  return (
    <nav
      aria-label="ページネーション"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
};

const PaginationContent = ({
  className,
  ...props
}: React.ComponentProps<"ul">) => {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
};

const PaginationItem = ({
  className,
  ...props
}: React.ComponentProps<"li">) => {
  return <li className={cn("", className)} {...props} />;
};

type PaginationButtonProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<typeof Button>;

const PaginationButton = ({
  className,
  isActive,
  size = "icon",
  variant = isActive ? "secondary" : "ghost",
  ...props
}: PaginationButtonProps) => {
  return (
    <Button
      aria-current={isActive ? "page" : undefined}
      className={cn("h-8 w-8 rounded-full p-0", className)}
      size={size}
      variant={variant}
      {...props}
    />
  );
};

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButton>) => {
  return (
    <PaginationButton
      aria-label="前のページ"
      className={cn(className)}
      {...props}
    >
      <ChevronLeft size={16} />
    </PaginationButton>
  );
};

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButton>) => {
  return (
    <PaginationButton
      aria-label="次のページ"
      className={cn(className)}
      {...props}
    >
      <ChevronRight size={16} />
    </PaginationButton>
  );
};

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-8 w-8 items-center justify-center text-sm", className)}
      {...props}
    >
      …
    </span>
  );
};

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
};
