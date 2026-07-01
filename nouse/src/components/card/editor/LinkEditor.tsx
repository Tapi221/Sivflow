import { Button } from "@web-renderer/chip/button/button/button";
import { Plus } from "@web-renderer/chip/icons";
import { Link } from "@web-renderer/chip/icons";
import { Input } from "@web-renderer/chip/input-field/input";
import { cn } from "@web-renderer/lib/utils";
import type { ReferenceBlockData } from "@/types";



type LinkEditorProps = {
  items: ReferenceBlockData[];
  onChange: (items: ReferenceBlockData[]) => void;
};



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
        <div
          key={index}
          className="relative rounded-xl border border-slate-100 bg-white p-2 shadow-sm group/link"
        >
          <button
            type="button"
            onClick={() => remove(index)}
            className="absolute -top-1 -right-1 z-20 rounded-full border border-slate-200 bg-white p-1 text-slate-400 opacity-0 shadow-sm transition-opacity group-hover/link:opacity-100 hover:border-red-200 hover:text-red-500"
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
            <div className="rounded-lg bg-slate-50 p-1.5 text-slate-400">
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
                className="h-8 flex-[3] bg-white text-xs text-[#202123] surface-concave focus-visible:ring-0 focus-visible:border-[#cfcfcf] focus-visible:bg-white"
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
                className="h-8 flex-[2] bg-white text-xs text-[#202123] surface-concave focus-visible:ring-0 focus-visible:border-[#cfcfcf] focus-visible:bg-white"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className={cn(
          "flex h-8 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-bold text-slate-400 transition-all hover:border-primary-200 hover:bg-primary-50/30 hover:text-primary-600",
          refs.length > 0
            ? "mt-1.5 border-slate-100 bg-slate-50/10"
            : "border-slate-200",
        )}
      >
        <Plus className="h-3 w-3" />
        <span>{refs.length > 0 ? "リンクを追加" : "リンクを設定"}</span>
      </Button>
    </div>
  );
};



export { LinkEditor };
