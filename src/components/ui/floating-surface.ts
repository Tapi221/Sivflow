import { cva, type VariantProps } from "class-variance-authority";

export const floatingSurfaceVariants = cva("", {
  variants: {
    surface: {
      default: "",
      menu: "ds-floating-panel ds-floating-panel--menu ds-floating-panel--glass text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      menuStrong:
        "ds-floating-panel ds-floating-panel--menu ds-floating-panel--glass ds-floating-panel--strong text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      filter:
        "ds-floating-panel ds-floating-panel--filter ds-floating-panel--glass ds-floating-panel--strong text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      panel:
        "surface-panel-floating ds-floating-panel ds-floating-panel--panel text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      plain: "border-transparent bg-transparent shadow-none backdrop-blur-0",
    },
  },
  defaultVariants: {
    surface: "default",
  },
});

export type FloatingSurfaceVariantProps = VariantProps<
  typeof floatingSurfaceVariants
>;
