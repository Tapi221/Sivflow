import { type CSSProperties } from "react";

type Props = { className?: string; style?: CSSProperties };

const WorkspaceActionToolbar = ({ className, style }: Props) => <div className={className} style={style} />;

export { WorkspaceActionToolbar };
