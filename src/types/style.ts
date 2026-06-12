import type { CSSProperties } from "react";



type CssVars = CSSProperties & Record<`--${string}`, string | number>;

export type { CssVars };
