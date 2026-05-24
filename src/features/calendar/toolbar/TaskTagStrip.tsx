import { TagChip } from "@/components/tag/TagChip";
import { getTagColorKey } from "@/features/tag/tagColor";
import { useTags } from "@/hooks/settings/useTags";

export const TaskTagStrip = () => {
  const { tags } = useTags();

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-2 pr-4">
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            label={tag.name}
            colorKey={getTagColorKey(tag.color)}
            className="shrink-0 max-w-[180px]"
          />
        ))}
      </div>
    </div>
  );
};
