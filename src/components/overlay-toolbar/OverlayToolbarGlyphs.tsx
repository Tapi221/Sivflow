import { useId, type ReactNode, type SVGProps } from "react";

import { cn } from "@/lib/utils";

type OverlayToolbarGlyphProps = SVGProps<SVGSVGElement> & {
  defs?: ReactNode;
};

const OVERLAY_TOOLBAR_GLYPH_CLASS_NAME = "h-3.5 w-3.5";

const OverlayToolbarGlyph = ({
  className,
  children,
  defs,
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
      {defs}
      {children}
    </svg>
  );
};

const PdfGradientDefs = ({ id }: { id: string }) => {
  return (
    <defs>
      <linearGradient
        id={id}
        x1="8"
        y1="2.5"
        x2="8"
        y2="13.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#111318" />
        <stop offset="58%" stopColor="#25272D" />
        <stop offset="100%" stopColor="#616673" />
      </linearGradient>
    </defs>
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

export const PdfPrevGlyph = () => {
  const gradientId = useId();

  return (
    <OverlayToolbarGlyph defs={<PdfGradientDefs id={gradientId} />}>
      <path
        d="M9.85 3.4 5.35 8l4.5 4.6"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M10.85 3.7 6.65 8l4.2 4.3"
        stroke={`url(#${gradientId})`}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.34"
      />
    </OverlayToolbarGlyph>
  );
};

export const PdfNextGlyph = () => {
  const gradientId = useId();

  return (
    <OverlayToolbarGlyph defs={<PdfGradientDefs id={gradientId} />}>
      <path
        d="M6.15 3.4 10.65 8l-4.5 4.6"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M5.15 3.7 9.35 8l-4.2 4.3"
        stroke={`url(#${gradientId})`}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.34"
      />
    </OverlayToolbarGlyph>
  );
};

export const PdfFitWidthGlyph = () => {
  const gradientId = useId();

  return (
    <OverlayToolbarGlyph defs={<PdfGradientDefs id={gradientId} />}>
      <rect
        x="2.5"
        y="2.75"
        width="11"
        height="10.5"
        rx="2"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.25"
        opacity="0.32"
      />
      <path
        d="M4.2 5.05v5.9M11.8 5.05v5.9"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.42"
      />
      <path
        d="M6.95 8H4.95"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.92"
      />
      <path
        d="M5.85 6.95 4.75 8l1.1 1.05"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M9.05 8h2"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.92"
      />
      <path
        d="M10.15 6.95 11.25 8l-1.1 1.05"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
    </OverlayToolbarGlyph>
  );
};

export const PdfSinglePageGlyph = () => {
  const gradientId = useId();

  return (
    <OverlayToolbarGlyph defs={<PdfGradientDefs id={gradientId} />}>
      <rect
        x="2.5"
        y="2.75"
        width="11"
        height="10.5"
        rx="2"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.25"
        opacity="0.32"
      />
      <rect
        x="4.65"
        y="3.9"
        width="6.7"
        height="8.2"
        rx="1.35"
        fill={`url(#${gradientId})`}
        opacity="0.9"
      />
    </OverlayToolbarGlyph>
  );
};

export const PdfDoublePageGlyph = () => {
  const gradientId = useId();

  return (
    <OverlayToolbarGlyph defs={<PdfGradientDefs id={gradientId} />}>
      <rect
        x="2.5"
        y="2.75"
        width="11"
        height="10.5"
        rx="2"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.25"
        opacity="0.32"
      />
      <rect
        x="3.6"
        y="4"
        width="3.55"
        height="8"
        rx="1.1"
        fill={`url(#${gradientId})`}
        opacity="0.92"
      />
      <rect
        x="8.05"
        y="4"
        width="3.55"
        height="8"
        rx="1.1"
        fill={`url(#${gradientId})`}
        opacity="0.58"
      />
    </OverlayToolbarGlyph>
  );
};
