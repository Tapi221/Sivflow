"use client";

import "@/chip/panel/dropdown-menu.css";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenu = ({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
};
const DropdownMenuPortal = ({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) => {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
};
const DropdownMenuTrigger = ({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) => {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
};
const DropdownMenuContent = ({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn("dropdown-menu__content", className)}
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
};
const DropdownMenuGroup = ({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) => {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
};
const DropdownMenuItem = ({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive"; }) => {
  return (
    <DropdownMenuPrimitive.Item
      className={cn("dropdown-menu__item", className)}
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      {...props}
    />
  );
};
const DropdownMenuCheckboxItem = ({ className, children, checked, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) => {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn("dropdown-menu__checkbox-item", className)}
      data-slot="dropdown-menu-checkbox-item"
      {...props}
    >
      <span className="dropdown-menu__indicator">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="dropdown-menu__indicator-icon" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
};
const DropdownMenuRadioGroup = ({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) => {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
};
const DropdownMenuRadioItem = ({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) => {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn("dropdown-menu__radio-item", className)}
      data-slot="dropdown-menu-radio-item"
      {...props}
    >
      <span className="dropdown-menu__indicator">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="dropdown-menu__indicator-dot" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
};
const DropdownMenuLabel = ({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean; }) => {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("dropdown-menu__label", className)}
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
    />
  );
};
const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => {
  return <DropdownMenuPrimitive.Separator className={cn("dropdown-menu__separator", className)} data-slot="dropdown-menu-separator" {...props} />;
};
const DropdownMenuShortcut = ({ className, ...props }: React.ComponentProps<"span">) => {
  return <span className={cn("dropdown-menu__shortcut", className)} data-slot="dropdown-menu-shortcut" {...props} />;
};
const DropdownMenuSub = ({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) => {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
};
const DropdownMenuSubTrigger = ({ className, inset, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean; }) => {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn("dropdown-menu__sub-trigger", className)}
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
    >
      {children}
      <ChevronRightIcon className="dropdown-menu__sub-trigger-icon" />
    </DropdownMenuPrimitive.SubTrigger>
  );
};
const DropdownMenuSubContent = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) => {
  return (
    <DropdownMenuPrimitive.SubContent
      className={cn("dropdown-menu__sub-content", className)}
      data-slot="dropdown-menu-sub-content"
      {...props}
    />
  );
};

export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger };
