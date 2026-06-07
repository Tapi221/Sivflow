import { type CSSProperties } from "react";
import { Tag } from "@/ui/icons";

type WorkspaceActionToolbarProps = { className?: string; style?: CSSProperties };

type WorkspaceAction = { key: string; label: string; text?: string };

const ACTIONS: readonly WorkspaceAction[] = [
  { key: "share", label: "共有", text: "共有" },
  { key: "comment", label: "コメント" },
  { key: "history", label: "履歴" },
  { key: "tag", label: "タグ" },
  { key: "favorite", label: "お気