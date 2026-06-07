import React from "react";

export type CardSurfaceFace = "question" | "answer";

export const CardSurfaceLayout = (p: any) => <div className={p.className}>{p.cardLayoutMode === "split" ? <>{p.questionNode}{p.answerNode}</> : (p.flipNode ?? p.questionNode)}</div>;
