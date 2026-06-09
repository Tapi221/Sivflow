import { locales } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useMemo, useRef, useState } from "react";
import "@blocknote/mantine/style.css";
import type { Note, NoteBlockContent } from "@/types";

type BlockNoteDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type BlockNoteLocaleCode = keyof typeof locales;

const NOTE_SAVE_DEBOUNCE_MS = 500;
const FALLBACK_BLOCKNOTE_LOCALE = "en" as BlockNoteLocaleCode;
const BLOCKNOTE_LOCALE_CODES = Object.keys(locales) as BlockNoteLocaleCode[];

const toInitialContent = (content: NoteBlockContent | undefined) => {
  return Array.isArray(content) && content.length > 0 ? content as never : undefined;
};

const findBlockNoteLocale = (value: string): BlockNoteLocaleCode | undefined => {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return undefined;

  return BLOCKNOTE_LOCALE_CODES.find((localeCode) => localeCode.toLowerCase() === normalizedValue);
};

const toBlockNoteLocaleCandidates = (language: string): string[] => {
  const normalizedLanguage = language.trim();
  if (!normalizedLanguage) return [];

  const regionSeparatorNormalizedLanguage = normalizedLanguage.replaceAll("-", "_");
  const primaryLanguage = regionSeparatorNormalizedLanguage.split("_")[0] ?? "";

  return [normalizedLanguage, regionSeparatorNormalizedLanguage, primaryLanguage];
};

const getLanguagePreferences = (): string[] => {
  const preferences: string[] = [];

  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) preferences.push(...navigator.languages);
    if (navigator.language) preferences.push(navigator.language);
  }

  if (typeof document !== "undefined") {
    preferences.push(document.documentElement.lang);
  }

  return preferences;
};

const getBlockNoteLocale = (): BlockNoteLocaleCode => {
  for (const language of getLanguagePreferences()) {
    for (const candidate of toBlockNoteLocaleCandidates(language)) {
      const locale = findBlockNoteLocale(candidate);
      if (locale) return locale;
    }
  }

  return FALLBACK_BLOCKNOTE_LOCALE;
};

const getPlainText = (blocks: unknown[]): string => blocks.map((block) => {
  if (!block || typeof block !== "object") return "";
  const content = (block as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => item && typeof item === "object" && "text" in item ? String((item as { text?: unknown }).text ?? "") : "").join("");
}).filter(Boolean).join("\n");

const BlockNoteDocumentEditor = ({ note, onChange }: BlockNoteDocumentEditorProps) => {
  const initialContent = useMemo(() => toInitialContent(note.content), [note.id, note.content]);
  const blockNoteLocale = useMemo(() => getBlockNoteLocale(), []);
  const editor = useCreateBlockNote({ initialContent, dictionary: locales[blockNoteLocale] }, [note.id, blockNoteLocale]);
  const latestChangeRef = useRef<Pick<Note, "content" | "contentText" | "contentVersion" | "editor"> | null>(null);
  const [saveRevision, setSaveRevision] = useState(0);

  useEffect(() => {
    if (!latestChangeRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const changes = latestChangeRef.current;
      latestChangeRef.current = null;
      if (changes) void onChange(changes);
    }, NOTE_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [onChange, saveRevision]);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white px-16 py-14 text-[#202124]">
      <div className="mx-auto w-full max-w-[820px]">
        <h1 className="mb-7 truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">{note.title}</h1>
        <BlockNoteView editor={editor} onChange={() => {
          const document = editor.document as unknown[];
          latestChangeRef.current = { content: document as NoteBlockContent, contentText: getPlainText(document), contentVersion: 1, editor: "blocknote" };
          setSaveRevision((revision) => revision + 1);
        }} />
      </div>
    </div>
  );
};

export { BlockNoteDocumentEditor };
