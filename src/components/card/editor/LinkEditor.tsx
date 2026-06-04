import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link, Plus } from "@/ui/icons";
import type { ReferenceBlockData } from "@/types";

type LinkEditorProps = {
  items: ReferenceBlockData[];
  onChange: (items: ReferenceBlockData[]) => void;
};

const LINK_ITEM_CLASS_NAME = "ds-link-editor__item relative rounded-xl p-2 group/link";
const LINK_REMOVE_CLASS_NAME = "ds-link-editor__remove absolute -top-1 -right-1 z-20 rounded-full p-1 opacity-0 transition-opacity group-hover/link:opacity-100";
const LINK_ICON_CLASS_NAME = "ds-link-editor__icon rounded-lg p-1.5";
const LINK_INPUT_CLASS_NAME = "ds-link-editor__input h-8 text-[11px] surface-concave focus-visible:ring-0";
const LINK_ADD_BUTTON_CLASS_NAME = "ds-link-editor__add-button flex h-8 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed text-[11px] font-bold transition-all";

const LinkEditor = ({ items, onChange }: LinkEditorProps) => {
  const refs = items ?? [];

  const add = () => onChange([...refs, { url: "", name: "" }]);
  const update = (index: number, patch: Partial<ReferenceBlockData>) => {
    const next = [...refs];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const remove = (index: number) => {
    onChange(refs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {refs.map((ref, index) => (
        <div key={index} className={LINK_ITEM_CLASS_NAME}>
          <button
            type="button"
            onClick={() => remove(index)}
            className={LINK_REMOVE_CLASS_NAME}
          >
            <span className="sr-only">削除</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className={LINK_ICON_CLASS_NAME}>
              <Link className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-1 gap-2">
              <Input
                value={ref.url ?? ""}
                onChange={(e) => update(index, { url: e.target.value })}
                placeholder="URL (https://...)"
                autoComplete="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                className={cn(LINK_INPUT_CLASS_NAME, "flex-[3]")}
                autoFocus={index === refs.length - 1}
              />
              <Input
                value={ref.name ?? ""}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="表示名"
                autoComplete="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                className={cn(LINK_INPUT_CLASS_NAME, "flex-[2]")}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className={cn(LINK_ADD_BUTTON_CLASS_NAME, refs.length > 0 && "mt-1.5")}
      >
        <Plus className="h-3 w-3" />
        <span>{refs.length > 0 ? "リンクを追加" : "リンクを設定"}</span>
      </Button>
    </div>
  );
};

export { LinkEditor };
