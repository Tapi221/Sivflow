import { memo, type CSSProperties } from "react";
import { Tag } from "@/ui/icons";

type WorkspaceActionToolbarProps = { className?: string; style?: CSSProperties };

const WorkspaceActionToolbarComponent = ({ className, style }: WorkspaceActionToolbarProps) => <div className={className} style={style} aria-label="ワークスペース操作" role="toolbar"><button type="button" aria-label="タグ"><Tag className="h-[18px] w-[18px]" /></button></div>;
