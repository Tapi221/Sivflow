import { type CSSProperties } from "react";
import { Tag } from "@/ui/icons";

type Props = { className?: string; style?: CSSProperties };

const WorkspaceActionToolbar = ({ className, style }: Props) => <div className={className} style={style} role="toolbar"><button type="button" aria-label="tag"><Tag /></button></div>;

export { WorkspaceActionToolbar };
