import type { CSSProperties } from "react";

type CssVars = CSSProperties & Partial<Record<`--${string}`, string | number>>;

export type { CssVars };
