import type { CSSProperties, ReactNode } from "react";
import { MetaPanelShell } from "./MetaPanelShell";



type EmptyMetaPanelProps = {
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  style?: CSSProperties;
};



const EmptyMetaPanel = ({ children, className, bodyClassName, contentClassName, style }: EmptyMetaPanelProps) => {
  return (<MetaPanelShell className={className} bodyClassName={bodyClassName} contentClassName={contentClassName} style={style} > {children} </MetaPanelShell>);
};



export { EmptyMetaPanel };
