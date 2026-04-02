import { cva, type VariantProps } from "class-variance-authority";

export const floatingSurfaceVariants = cva("", {
  variants: {
    surface: {
      default: "",
      floating:
        "surface-floating text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      strong:
        "surface-floating-strong text-[var(--floating-surface-foreground,var(--text-primary,#1e293b))]",
      plain:
        "border-transparent bg-transparent shadow-none backdrop-blur-0",
    },
  },
  defaultVariants: {
    surface: "default",
  },
});

export type FloatingSurfaceVariantProps = VariantProps<
  typeof floatingSurfaceVariants
>;
