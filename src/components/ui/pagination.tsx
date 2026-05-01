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
      className={cn("flex flex-row items-center gap-2", className)}
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
      className={cn(
        "h-8 min-w-8 rounded-full border border-[#e5e7eb] bg-[#ffffff] px-3 text-[12px] font-semibold text-[#52606d] shadow-none hover:bg-[#f8fafc]",
        isActive && "border-transparent bg-[#f3f4f6] text-[#4b5563] hover:bg-[#eef2f6]",
        className,
      )}
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
      className={cn("w-8 px-0", className)}
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
      className={cn("w-8 px-0", className)}
      {...props}
    >
      <ChevronRight size={16} />
    </PaginationButton>
  );
};

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
};
