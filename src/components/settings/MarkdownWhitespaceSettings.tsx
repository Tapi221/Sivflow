import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsNote } from "@/components/settings/settingsUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
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
      "Markdown 本文段落と引用内本文で、Tab を 2 スペースに展開します。",
  },
  {
    value: 4,
    label: "4 spaces",
    description:
      "Markdown 本文段落と引用内本文で、Tab を 4 スペースに展開します。",
  },
  {
    value: 8,
    label: "8 spaces",
    description:
      "Markdown 本文段落と引用内本文で、Tab を 8 スペースに展開します。",
  },
];

export const MarkdownWhitespaceSettings = () => {
  const { settings, updateSettings } = useUserSettings();
  const currentValue = String(clampMarkdownTabSize(settings?.markdownTabSize));

  return (
    <SettingsSection
      title="Markdown whitespace"
      description="本文段落と引用内本文だけ、編集画面と閲覧画面の空白幅を一致させます。"
    >
      <SettingsRow
        title="Tab の変換幅"
        description="入力時 / 貼り付け時に、対象行のタブを即座にスペースへ変換します。"
        action={
          <Select
            value={currentValue}
            onValueChange={(value) =>
              void updateSettings({
                markdownTabSize: clampMarkdownTabSize(Number(value)),
              })
            }
          >
            <SelectTrigger className="w-full min-w-[180px] bg-white sm:w-[180px]">
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
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {TAB_SIZE_OPTIONS.map((option) => {
          const isActive = String(option.value) === currentValue;

          return (
            <div
              key={option.value}
              className={cn(
                "rounded-2xl border px-4 py-4 transition-all",
                isActive
                  ? "border-primary-300 bg-primary-50/40 shadow-sm ring-1 ring-primary-200/60"
                  : "border-slate-200 bg-slate-50/60",
              )}
            >
              <div className="text-sm font-semibold text-slate-900">
                {option.label}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-500">
                {option.description}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SettingsNote tone="info">
          <div className="text-xs font-semibold uppercase tracking-[0.08em]">
            適用対象
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm leading-6">
            <li>通常本文の段落</li>
            <li>引用ブロック内の本文段落</li>
          </ul>
        </SettingsNote>

        <SettingsNote>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
            適用対象外
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-600">
            <li>見出し（ATX 見出し / Setext 見出し）</li>
            <li>リスト / タスクリスト</li>
            <li>表</li>
            <li>インラインコード / コードブロック</li>
            <li>引用内でも、リスト / 表 / コードに属する部分</li>
          </ul>
        </SettingsNote>
      </div>
    </SettingsSection>
  );
};
