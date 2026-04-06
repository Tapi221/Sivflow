import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import {
  clampMarkdownTabSize,
  type MarkdownTabSize,
} from "@/utils/markdownWhitespace";

const TAB_SIZE_OPTIONS: Array<{
  value: MarkdownTabSize;
  label: string;
  description: string;
}> = [
  {
    value: 2,
    label: "2 spaces",
    description:
      "Markdown 本文段落・引用内本文で Tab を 2 スペースへ展開します",
  },
  {
    value: 4,
    label: "4 spaces",
    description:
      "Markdown 本文段落・引用内本文で Tab を 4 スペースへ展開します",
  },
  {
    value: 8,
    label: "8 spaces",
    description:
      "Markdown 本文段落・引用内本文で Tab を 8 スペースへ展開します",
  },
];

export const MarkdownWhitespaceSettings = () => {
  const { settings, updateSettings } = useUserSettings();
  const currentValue = String(clampMarkdownTabSize(settings?.markdownTabSize));

  return (
    <div className="space-y-4">
      <div>
        <div className="font-bold text-slate-700 text-sm mb-1">
          Markdown whitespace
        </div>
        <div className="text-[11px] text-slate-400">
          本文段落と引用内本文だけ、編集画面と閲覧画面の空白を一致させます。
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-bold text-slate-700 text-sm">Tab の変換幅</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              入力時 / 貼り付け時に、対象行だけスペースへ即変換します
            </div>
          </div>

          <Select
            value={currentValue}
            onValueChange={(value) =>
              updateSettings({
                markdownTabSize: clampMarkdownTabSize(Number(value)),
              })
            }
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select tab size" />
            </SelectTrigger>
            <SelectContent>
              {TAB_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-2">
          {TAB_SIZE_OPTIONS.map((option) => {
            const isActive = String(option.value) === currentValue;

            return (
              <div
                key={option.value}
                className={[
                  "rounded-xl border px-3 py-2 text-xs transition-colors",
                  isActive
                    ? "border-primary-300 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-slate-50 text-slate-500",
                ].join(" ")}
              >
                <div className="font-bold">{option.label}</div>
                <div className="mt-0.5">{option.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-bold text-slate-600 mb-2">適用対象</div>
        <ul className="list-disc pl-5 text-[11px] leading-5 text-slate-500">
          <li>通常本文の段落</li>
          <li>引用ブロック内の本文段落</li>
        </ul>

        <div className="text-xs font-bold text-slate-600 mt-4 mb-2">
          適用対象外
        </div>
        <ul className="list-disc pl-5 text-[11px] leading-5 text-slate-500">
          <li>見出し（ATX 見出し / Setext 見出し）</li>
          <li>リスト / タスクリスト</li>
          <li>表</li>
          <li>インラインコード / コードブロック</li>
          <li>引用内であっても、リスト / 表 / コードに属する部分</li>
        </ul>
      </div>
    </div>
  );
};
