import { memo, type CSSProperties, type SVGProps } from "react";
import { Tag } from "@/ui/icons";

type WorkspaceActionToolbarProps = {
  className?: string;
  style?: CSSProperties;
};

type ToolbarIconProps = SVGProps<SVGSVGElement>;

type WorkspaceAction = {
  key: "share" | "comment" | "history" | "tag" | "favorite" | "more";
  label: string;
  text?: string;
};

const TOOLBAR_CLASS_NAME = "pointer-events-auto flex h-9 items-center gap-