import { TagChip } from "@/components/tag/TagChip";
import { getTagColorKey } from "@/features/tag/tagColor";
import { useTags } from "@/hooks/settings/useTags";

export const TaskTagStrip = () => {
  const { tags } = useTags();

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex h-8 min-w-0 flex-1 items-center rounded-xl bg-[#f7f7f7] p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-1.5 px-1">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              label={tag.name}
              colorKey={getTagColorKey(tag.color)}
              className="h-7 shrink-0 max-w-[180px] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
