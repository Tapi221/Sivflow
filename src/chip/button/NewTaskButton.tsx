import { CreateActionPlusIcon } from "@/chip/icon/CreateActionPlusIcon";
import { useT } from "@/i18n/useT";

type NewTaskButtonProps = {
  onClick: () => void;
};

export const NewTaskButton = ({ onClick }: NewTaskButtonProps) => {
  const t = useT();

  return (
    <button
      type="button"
      onClick={onClick}
      title={t.addTask}
      aria-label={t.addTask}
      className="
        group
        flex
        h-8
        min-w-0
        max-w-[116px]
        items-center
        justify-center
        gap-1.5
        overflow-hidden
        rounded-lg
        border
        border-[#e9eaed]
        bg-white
        px-2.5
        text-[12px]
        font-medium
        text-[#8f929c]
        transition-colors
        hover:bg-[#f7f8fa]
        hover:text-[#4c5361]
        active:bg-[#eef1f5]
      "
    >
      <CreateActionPlusIcon
        className="h-4 w-4 shrink-0 bg-transparent text-[#8f929c] shadow-none group-hover:scale-100 group-hover:text-[#4c5361]"
        iconClassName="h-3.5 w-3.5"
      />

      <span className="min-w-0 truncate whitespace-nowrap">{t.addTask}</span>
    </button>
  );
};
