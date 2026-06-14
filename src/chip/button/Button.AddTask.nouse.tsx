type AddTaskButtonProps = {
  onClick?: () => void;
};

const ADD_TASK_BUTTON_LABEL = "新しいタスクを作成";

const AddTaskButton = ({ onClick }: AddTaskButtonProps) => {
  return (<button type="button" onClick={onClick} title={ADD_TASK_BUTTON_LABEL} aria-label={ADD_TASK_BUTTON_LABEL} className=" flex h-9 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-md bg-[#f5f6fa] px-2 text-xs font-medium text-[#8b8fa3] transition-colors hover:bg-[#eceef5] " > <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" > <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> </svg> <span className="min-w-0 truncate whitespace-nowrap"> {ADD_TASK_BUTTON_LABEL} </span> </button>);
};

export { AddTaskButton };
