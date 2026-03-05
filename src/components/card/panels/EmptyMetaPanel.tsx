import type { CSSProperties } from "react";

import { MetaPanelShell } from "@/components/card/panels/MetaPanelShell";

type EmptyMetaPanelProps = {
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  style?: CSSProperties;
};

export function EmptyMetaPanel({
  className,
  bodyClassName,
  contentClassName,
  style,
}: EmptyMetaPanelProps) {
  return (
    <MetaPanelShell
      className={className}
      bodyClassName={bodyClassName}
      contentClassName={contentClassName}
      style={style}
    />
  );
}
