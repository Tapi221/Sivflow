import { memo, type CSSProperties } from "react";
import { Tag } from "@/ui/icons";

type Props = { className?: string; style?: CSSProperties };

const C = ({ className, style }: Props) => <div className={className} style={style} aria-label="ワークスペース操作" role="toolbar"><button type="button" aria-label="タグ"><Tag className="h-[18px] w-[18px]" /></button></div>;

const WorkspaceAction