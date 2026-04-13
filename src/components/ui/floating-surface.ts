import { cva, type VariantProps } from "class-variance-authority";

export const floatingSurfaceVariants = cva("", {
  variants: {
    surface: {
      default: "",
      floating:
        "surface-floating ds-menu-surface ds-menu-surface--glass text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      strong:
        "surface-floating-strong ds-menu-surface ds-menu-surface--glass ds-menu-surface--strong text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      panel:
        "surface-panel-floating text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
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
