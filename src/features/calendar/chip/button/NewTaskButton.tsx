import { CreateActionPlusIcon } from "@/features/calendar/chip/button/CreateActionPlusIcon";
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
      className="
        group
        flex
        h-[40px]
        items-center
        justify-center
        gap-2
        rounded-[14px]
        border
        border-[#dfe3eb]
        bg-white/95
        px-4
        text-[13px]
        font-semibold
        text-[#007aff]
        shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)]
        transition-all
        duration-150
        hover:border-[#cfd6e2]
        hover:bg-white
        hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_28px_rgba(15,23,42,0.08)]
        active:scale-[0.985]
        active:bg-[#f7f8fb]
      "
    >
      <CreateActionPlusIcon />

      <span>{t.addTask}</span>
    </button>
  );
};
