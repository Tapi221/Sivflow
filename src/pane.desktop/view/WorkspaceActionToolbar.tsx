import { memo, type CSSProperties, type SVGProps } from "react";
import { Clock, Star } from "@/ui/icons";

type WorkspaceActionToolbarProps = {
  className?: string;
  style?: CSSProperties;
};

type ToolbarIconProps = SVGProps<SVGSVGElement>;

type WorkspaceAction = {
  key: "share" | "comment" | "history" | "favorite" | "more";
  label: string;
  text?: string;
};

const TOOLBAR_CLASS_NAME = "pointer-events-auto flex h-9 items-center gap-2 rounded-[14px] bg-transparent text-[#8a8986]";
const ACTION_BUTTON_CLASS_NAME = "flex h-8 w-8 items-center justify-center rounded-[10px] border border-transparent bg-transparent text-[#8a8986] outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[rgba(0,0,0,0.04)] hover:bg-[#f4f3f1] hover:text-[#3a3a38] active:scale-[0.98] focus-visible:border-[rgba(0,0,0,0.08)] focus-visible:bg-[#f4f3f1] focus-visible:text-[#3a3a38] motion-reduce:transition-none motion-reduce:active:scale-100";
const SHARE_BUTTON_CLASS_NAME = "flex h-8 items-center gap-1.5 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white/75 px-3 text-[13px] font-medium leading-none tracking-[-0.015em] text-[#7d7b78] shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[rgba(0,0,0,0.08)] hover:bg-[#f7f6f4] hover:text-[#3a3a38] active:scale-[0.98] focus-visible:border-[rgba(0,0,0,0.10)] focus-visible:bg-[#f7f6f4] focus-visible:text-[#3a3a38] motion-reduce:transition-none motion-reduce:active:scale-100";
const ICON_CLASS_NAME = "h-[18px] w-[18px] shrink-0";
const ACTIONS: readonly WorkspaceAction[] = [
  { key: "share", label: "共有", text: "共有" },
  { key: "comment", label: "コメント" },
  { key: "history", label: "履歴" },
  { key: "favorite", label: "お気に入り" },
  { key: "more", label: "その他" },
];

const ShareIcon = (props: ToolbarIconProps) => {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.5 17.25V14.2C5.5 11.38 7.78 9.1 10.6 9.1H18.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.05 5.95L18.2 9.1L15.05 12.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const CommentIcon = (props: ToolbarIconProps) => {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.75 5.25H17.25C18.77 5.25 20 6.48 20 8V13.75C20 15.27 18.77 16.5 17.25 16.5H11.35L7.2 19.5V16.5H6.75C5.23 16.5 4 15.27 4 13.75V8C4 6.48 5.23 5.25 6.75 5.25Z" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MoreIcon = (props: ToolbarIconProps) => {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
};

const getToolbarClassName = (className?: string): string => {
  return [TOOLBAR_CLASS_NAME, className].filter(Boolean).join(" ");
};

const renderActionIcon = (action: WorkspaceAction) => {
  if (action.key === "share") return <ShareIcon className={ICON_CLASS_NAME} />;
  if (action.key === "comment") return <CommentIcon className={ICON_CLASS_NAME} />;
  if (action.key === "history") return <Clock className={ICON_CLASS_NAME} />;
  if (action.key === "favorite") return <Star className={ICON_CLASS_NAME} />;
  return <MoreIcon className={ICON_CLASS_NAME} />;
};

const WorkspaceActionToolbarComponent = ({ className, style }: WorkspaceActionToolbarProps) => {
  return (
    <div className={getToolbarClassName(className)} style={style} aria-label="ワークスペース操作" role="toolbar">
      {ACTIONS.map((action) => (
        <button key={action.key} type="button" className={action.key === "share" ? SHARE_BUTTON_CLASS_NAME : ACTION_BUTTON_CLASS_NAME} aria-label={action.label} title={action.label}>
          {renderActionIcon(action)}
          {action.text ? <span>{action.text}</span> : null}
        </button>
      ))}
    </div>
  );
};

const WorkspaceActionToolbar = memo(WorkspaceActionToolbarComponent);

WorkspaceActionToolbar.displayName = "WorkspaceActionToolbar";

export { WorkspaceActionToolbar };
