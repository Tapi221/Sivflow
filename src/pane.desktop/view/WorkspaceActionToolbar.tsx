import { type CSSProperties } from "react";
import { Tag } from "@/ui/icons";

type Props = { className?: string; style?: CSSProperties };

const WorkspaceActionToolbar = ({ className, style }: Props) => <div className={className} style={style}><Tag /></div>;

export { WorkspaceActionToolbar };
