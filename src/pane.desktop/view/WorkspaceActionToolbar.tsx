import { type CSSProperties } from "react";
import { Tag } from "@/ui/icons";

type Props = { className?: string; style?: CSSProperties };

const labels = ["share", "comment", "history", "tag", "favorite", "more"] as const;
const WorkspaceActionToolbar = ({ className, style }: Props) => <div className={className} style={style} role="toolbar">{labels.map((label) => <button key={label} type="button" aria-label={