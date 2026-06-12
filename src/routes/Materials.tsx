import { useCallback, useEffect, useMemo, useState } from "react";

type MaterialKind = "textbook" | "pdf" | "video" | "link" | "other";
type MaterialItem = {
  id: string;
  title: string;
  kind: MaterialKind;
  description: string;
  source: string;
  createdAt: string;
};
type MaterialFormState = {
  title: string;
  kind: MaterialKind;
  description: string;
  source: string;
};
type MaterialCardProps = {
  material: MaterialItem;
  onDelete: (id: string) => void;
};

const MATERIALS_STORAGE_KEY = "sivflow:materials";
const INITIAL_FORM_STATE: MaterialFormState = { title: "", kind: "textbook", description: "", source: "" };
const MATERIAL_KIND_OPTIONS: Array<{ label: string; value: MaterialKind; }> = [
  { label: "教科書", value: "textbook" },
  { label: "PDF", value: "pdf" },
  { label: "動画", value: "video" },
  { label: "リンク", value: "link" },
  { label: "その他", value: "other" },
];
const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = MATERIAL_KIND_OPTIONS.reduce((labels, option) => ({ ...labels, [option.value]: option.label }), {} as Record<MaterialKind, string>);

const createMaterialId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const parseMaterials = (value: string | null): MaterialItem[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MaterialItem => typeof item?.id === "string" && typeof item?.title === "string" && typeof item?.kind === "string");
  } catch {
    return [];
  }
};
const readMaterials = (): MaterialItem[] => {
  if (typeof window === "undefined") return [];
  return parseMaterials(window.localStorage.getItem(MATERIALS_STORAGE_KEY));
};
const persistMaterials = (materials: MaterialItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
};
const sortMaterials = (materials: MaterialItem[]): MaterialItem[] => {
  return [...materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const MaterialCard = ({ material, onDelete }: MaterialCardProps) => {
  return (
    <article className="rounded-[18px] border border-[#dddcd5] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#24211d]">{material.title}</p>
          <p className="mt-1 text-[12px] font-semibold text-[#7a756d]">{MATERIAL_KIND_LABELS[material.kind] ?? "その他"}</p>
        </div>
        <button type="button" className="rounded-[9px] px-2 py-1 text-[12px] font-semibold text-[#9a4d4d] hover:bg-[#f6eeee]" onClick={() => onDelete(material.id)}>
          削除
        </button>
      </div>
      {material.description ? <p className="mt-3 whitespace-pre-wrap text-[12px] font-medium leading-[1.7] text-[#5f5a52]">{material.description}</p> : null}
      {material.source ? <p className="mt-3 truncate text-[12px] font-medium text-[#7a756d]">参照元: {material.source}</p> : null}
    </article>
  );
};
const Materials = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>(readMaterials);
  const [formState, setFormState] = useState<MaterialFormState>(INITIAL_FORM_STATE);
  const [error, setError] = useState<string | null>(null);
  const sortedMaterials = useMemo(() => sortMaterials(materials), [materials]);

  useEffect(() => {
    persistMaterials(materials);
  }, [materials]);

  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((current) => ({ ...current, title: event.target.value }));
  }, []);
  const handleKindChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((current) => ({ ...current, kind: event.target.value as MaterialKind }));
  }, []);
  const handleDescriptionChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState((current) => ({ ...current, description: event.target.value }));
  }, []);
  const handleSourceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((current) => ({ ...current, source: event.target.value }));
  }, []);
  const handleDelete = useCallback((id: string) => {
    setMaterials((current) => current.filter((material) => material.id !== id));
  }, []);
  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = formState.title.trim();

    if (!title) {
      setError("教材名を入力してください。");
      return;
    }

    setError(null);
    setMaterials((current) => [{ id: createMaterialId(), title, kind: formState.kind, description: formState.description.trim(), source: formState.source.trim(), createdAt: new Date().toISOString() }, ...current]);
    setFormState(INITIAL_FORM_STATE);
  }, [formState]);

  return (
    <main className="h-full min-h-0 w-full overflow-y-auto bg-[#f7f5ef] px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-[22px] border border-[#dddcd5] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h1 className="text-[20px] font-bold tracking-[-0.03em] text-[#24211d]">教材登録</h1>
          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-[12px] font-bold text-[#5f5a52]">
              教材名
              <input className="h-10 rounded-[12px] border border-[#d8d4ca] bg-[#fbfaf7] px-3 text-[14px] font-medium text-[#24211d] outline-none focus:border-[#b9b1a2]" value={formState.title} onChange={handleTitleChange} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-bold text-[#5f5a52]">
              種別
              <select className="h-10 rounded-[12px] border border-[#d8d4ca] bg-[#fbfaf7] px-3 text-[14px] font-medium text-[#24211d] outline-none focus:border-[#b9b1a2]" value={formState.kind} onChange={handleKindChange}>
                {MATERIAL_KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[12px] font-bold text-[#5f5a52]">
              参照元
              <input className="h-10 rounded-[12px] border border-[#d8d4ca] bg-[#fbfaf7] px-3 text-[14px] font-medium text-[#24211d] outline-none focus:border-[#b9b1a2]" value={formState.source} onChange={handleSourceChange} placeholder="URL / 書籍情報 / 保管場所" />
            </label>
            <label className="grid gap-1.5 text-[12px] font-bold text-[#5f5a52]">
              メモ
              <textarea className="min-h-[96px] rounded-[12px] border border-[#d8d4ca] bg-[#fbfaf7] px-3 py-2 text-[14px] font-medium text-[#24211d] outline-none focus:border-[#b9b1a2]" value={formState.description} onChange={handleDescriptionChange} />
            </label>
            {error ? <p className="text-[12px] font-semibold text-[#9a4d4d]">{error}</p> : null}
            <button type="submit" className="h-10 rounded-[12px] bg-[#24211d] px-4 text-[13px] font-bold text-white hover:bg-[#3a352f]">
              登録する
            </button>
          </form>
        </section>
        <section className="grid gap-3">
          {sortedMaterials.length > 0 ? sortedMaterials.map((material) => <MaterialCard key={material.id} material={material} onDelete={handleDelete} />) : <div className="rounded-[18px] border border-dashed border-[#d8d4ca] bg-white p-8 text-center text-[13px] font-semibold text-[#7a756d]">登録済みの教材はありません。</div>}
        </section>
      </div>
    </main>
  );
};

export default Materials;
