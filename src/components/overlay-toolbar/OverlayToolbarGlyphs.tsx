import { type SVGProps } from "react";

import { cn } from "@/lib/utils";

type OverlayToolbarGlyphProps = SVGProps<SVGSVGElement>;

const OVERLAY_TOOLBAR_GLYPH_CLASS_NAME = "h-3.5 w-3.5";

const OverlayToolbarGlyph = ({
  className,
  children,
  ...props
}: OverlayToolbarGlyphProps) => {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn(OVERLAY_TOOLBAR_GLYPH_CLASS_NAME, className)}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
};

export const FixedDisplayGlyph = () => (
  <OverlayToolbarGlyph>
    <rect
      x="2.75"
      y="2.75"
      width="10.5"
      height="10.5"
      rx="2.25"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.35"
    />
    <rect
      x="4.75"
      y="4"
      width="6.5"
      height="8"
      rx="1.5"
      fill="currentColor"
      opacity="0.9"
    />
  </OverlayToolbarGlyph>
);

export const FluidDisplayGlyph = () => (
  <OverlayToolbarGlyph>
    <path
      d="M5.25 2.5H2.5v2.75M10.75 2.5h2.75v2.75M13.5 10.75v2.75h-2.75M5.25 13.5H2.5v-2.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="4"
      y="4"
      width="8"
      height="8"
      rx="1.75"
      fill="currentColor"
      opacity="0.9"
    />
  </OverlayToolbarGlyph>
);

export const StackGlyph = () => (
  <OverlayToolbarGlyph>
    <rect
      x="3"
      y="2.5"
      width="10"
      height="4.25"
      rx="1.4"
      fill="currentColor"
      opacity="0.92"
    />
    <rect
      x="3"
      y="9.25"
      width="10"
      height="4.25"
      rx="1.4"
      fill="currentColor"
      opacity="0.58"
    />
  </OverlayToolbarGlyph>
);

export const FlipGlyph = () => (
  <OverlayToolbarGlyph>
    <rect
      x="2.75"
      y="5"
      width="7"
      height="5.5"
      rx="1.35"
      stroke="currentColor"
      strokeWidth="1.25"
      opacity="0.45"
    />
    <rect
      x="6.25"
      y="2.5"
      width="7"
      height="5.5"
      rx="1.35"
      fill="currentColor"
      opacity="0.9"
    />
    <path
      d="M4.25 12.25c1.15.95 2.55 1.35 4.2 1.35 1.25 0 2.35-.22 3.3-.68"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M11.1 11.65l1.85 1.2-1.95.9"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
  </OverlayToolbarGlyph>
);

export const SplitGlyph = () => (
  <OverlayToolbarGlyph>
    <rect
      x="2.5"
      y="2.75"
      width="11"
      height="10.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
      opacity="0.32"
    />
    <rect
      x="3.75"
      y="4"
      width="3.75"
      height="8"
      rx="1.2"
      fill="currentColor"
      opacity="0.92"
    />
    <rect
      x="8.5"
      y="4"
      width="3.75"
      height="8"
      rx="1.2"
      fill="currentColor"
      opacity="0.58"
    />
  </OverlayToolbarGlyph>
);

export const PdfPrevGlyph = () => (
  <OverlayToolbarGlyph>
    <path
      d="M9.75 3.5 5.25 8l4.5 4.5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </OverlayToolbarGlyph>
);

export const PdfNextGlyph = () => (
  <OverlayToolbarGlyph>
    <path
      d="M6.25 3.5 10.75 8l-4.5 4.5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </OverlayToolbarGlyph>
);

export const PdfFitWidthGlyph = () => (
  <OverlayToolbarGlyph>
    <path
      d="M3.2 4.15v7.7M12.8 4.15v7.7"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      opacity="0.58"
    />
    <path
      d="M6.85 8H3.95M5.1 6.85 3.95 8 5.1 9.15"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.15 8h2.9M10.9 6.85 12.05 8 10.9 9.15"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </OverlayToolbarGlyph>
);

export const PdfSinglePageGlyph = () => (
  <OverlayToolbarGlyph>
    <rect
      x="4.75"
      y="2.75"
      width="6.5"
      height="10.5"
      rx="1.6"
      stroke="currentColor"
      strokeWidth="1.45"
    />
    <path
      d="M6.55 5.55h2.9M6.55 8h2.9M6.55 10.45h1.95"
      stroke="currentColor"
      strokeWidth="1.05"
      strokeLinecap="round"
      opacity="0.48"
    />
  </OverlayToolbarGlyph>
);

export const PdfDoublePageGlyph = () => (
  <OverlayToolbarGlyph>
    <rect
      x="2.65"
      y="3.2"
      width="4.55"
      height="9.6"
      rx="1.25"
      stroke="currentColor"
      strokeWidth="1.35"
    />
    <rect
      x="8.8"
      y="3.2"
      width="4.55"
      height="9.6"
      rx="1.25"
      stroke="currentColor"
      strokeWidth="1.35"
      opacity="0.72"
    />
  </OverlayToolbarGlyph>
);
