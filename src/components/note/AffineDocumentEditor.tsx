import { useCallback, useEffect, useRef, useState } from "react";
import { createBlocksuiteAffineEditor, createBlocksuiteNoteContent, readBlocksuiteText, type BlocksuiteAffineEditor } from "./AffineDocumentEditor.blocksuite";
import type { Note } from "@/types";

type AffineDocumentEditorChange = Partial<Pick<Note, "title" | "content" | "contentText" | "contentVersion" | "editor">>;

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: AffineDocumentEditorChange) => void | Promise<void>;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_PAGE_ROOT_CLASS_NAME = "h-full min-h-0 w-full overflow-y-auto bg-white text-[#202124]";
const NOTE_PAGE_CONTAINER_CLASS_NAME = "mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-8 pb-16 pt-7";
const NOTE_ADD_ICON_CLASS_NAME = "mb-6 flex w-fit items-center gap-2 rounded-[6px] px-2 py-1 text-[15px] font-medium leading-none tracking-[-0.01em] text-[#8b8f94] transition hover:bg-[#f1f3f4] hover:text-[#5f6368]";
const NOTE_ADD_ICON_MARK_CLASS_NAME = "flex h-4 w-4 items-center justify-center rounded-full bg-[#b9bdc2] text-[11px] font-bold leading-none text-white";
const NOTE_TITLE_INPUT_CLASS_NAME = "mb-12 w-full border-0 bg-transparent p-0 text-[56px] font-bold leading-[1.06] tracking-[-0.045em] text-[#202124] caret-[#202124] outline-none placeholder:text-[#dedfe2]";
const NOTE_INFO_SECTION_CLASS_NAME = "mb-14 border-b border-[#e7e8ea] pb-4";
const NOTE_INFO_HEADER_CLASS_NAME = "flex h-8 items-center justify-between text-[19px] font-semibold tracking-[-0.02em] text-[#7c8288]";
const NOTE_INFO_CHEVRON_CLASS_NAME = "text-[18px] leading-none text-[#8b8f94]";
const NOTE_EDITOR_SECTION_CLASS_NAME = "relative min-h-[360px] w-full";
const NOTE_EDITOR_HOST_CLASS_NAME = "min-h-[360px] w-full overflow-visible bg-transparent";
const NOTE_EDITOR_LOADING_CLASS_NAME = "flex min-h-[360px] w-full items-center justify-center bg-transparent text-[#9aa0a6]";
const NOTE_EDITOR_LOADING_SPINNER_CLASS_NAME = "h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent";
const NOTE_EDITOR_ERROR_CLASS_NAME = "flex min-h-[360px] w-full items-center justify-center bg-transparent px-6 text-center text-[12px] font-medium text-[#9aa0a6]";
const NOTE_EDITOR_PLACEHOLDER_CLASS_NAME = "pointer-events-none absolute left-0 top-3 z-10 select-none text-[15px] font-medium tracking-[-0.01em] text-[#9aa0a6]";
const NOTE_LINKS_SECTION_CLASS_NAME = "mt-20 border-t border-[#e7e8ea] pt-5";
const NOTE_LINKS_HEADER_CLASS_NAME = "flex items-center justify-between text-[20px] font-semibold tracking-[-0.03em] text-[#202124]";
const NOTE_LINKS_BUTTON_CLASS_NAME = "rounded-[10px] border border-[#e1e3e6] bg-white px-4 py-2 text-[14px] font-semibold leading-none text-[#202124] shadow-sm transition hover:bg-[#f8f9fa]";
const NOTE_LOADING_LABEL = "AFFiNE を読み込み中";
const NOTE_ERROR_LABEL = "AFFiNE エディタを起動できませんでした。Console の BlockSuite エラーを確認してください。";
const NOTE_EMPTY_PLACEHOLDER_LABEL = "「/」でブロックを追加";
const NOTE_ADD_ICON_LABEL = "Add icon";
const NOTE_TITLE_PLACEHOLDER = "Title";
const NOTE_INFO_LABEL = "情報";
const NOTE_LINKS_LABEL = "Bi-Directional Links";
const NOTE_LINKS_BUTTON_LABEL = "表示";

const hasNoteContent = (note: Note): boolean => Boolean(note.contentText?.trim());

const normalizeTitle = (title: string): string => title.trim();

const renderLoadingSpinner = (host: HTMLDivElement): void => {
  const spinner = document.createElement("span");
  const label = document.createElement("span");
  spinner.setAttribute("aria-hidden", "true");
  spinner.className = NOTE_EDITOR_LOADING_SPINNER_CLASS_NAME;
  label.className = "sr-only";
  label.textContent = NOTE_LOADING_LABEL;
  host.className = NOTE_EDITOR_LOADING_CLASS_NAME;
  host.setAttribute("role", "status");
  host.setAttribute("aria-label", NOTE_LOADING_LABEL);
  host.replaceChildren(spinner, label);
};

const renderEditorError = (host: HTMLDivElement, error: unknown): void => {
  console.error("[AFFiNE note editor] Failed to mount BlockSuite editor", error);
  host.className = NOTE_EDITOR_ERROR_CLASS_NAME;
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.textContent = NOTE_ERROR_LABEL;
};

const mountEditor = (host: HTMLDivElement, editor: BlocksuiteAffineEditor["editor"]): void => {
  host.className = NOTE_EDITOR_HOST_CLASS_NAME;
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.replaceChildren(editor);
};

const focusEditor = (editor: BlocksuiteAffineEditor["editor"]): void => {
  const editableElement = editor.querySelector<HTMLElement>("[contenteditable='true']");
  (editableElement ?? editor).focus({ preventScroll: true });
};

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<BlocksuiteAffineEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);
  const latestSavedTextRef = useRef<string>(note.contentText ?? "");
  const [isEmpty, setIsEmpty] = useState(() => !hasNoteContent(note));
  const [titleValue, setTitleValue] = useState(note.title);

  onChangeRef.current = onChange;

  const saveNow = useCallback(() => {
    const host = hostRef.current;
    const editor = editorRef.current;
    if (!host || !editor) return;
    const contentText = readBlocksuiteText(editor.doc, host);
    setIsEmpty(contentText.trim().length === 0);
    if (contentText === latestSavedTextRef.current) return;
    latestSavedTextRef.current = contentText;
    void onChangeRef.current({ content: createBlocksuiteNoteContent(editor.doc, host, contentText), contentText, contentVersion: 2, editor: "affine" });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(saveNow, NOTE_SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  const saveTitle = useCallback(() => {
    const nextTitle = normalizeTitle(titleValue);
    if (nextTitle === note.title) return;
    void onChangeRef.current({ title: nextTitle });
  }, [note.title, titleValue]);

  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(event.currentTarget.value);
  }, []);

  const handleTitleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
  }, []);

  const handleEditorPointerDown = useCallback(() => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    focusEditor(editor);
  }, []);

  useEffect(() => {
    setTitleValue(note.title);
  }, [note.id, note.title]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let isDisposed = false;
    const abortController = new AbortController();
    const mutationObserver = new MutationObserver(scheduleSave);

    editorRef.current = null;
    renderLoadingSpinner(host);
    latestSavedTextRef.current = note.contentText ?? "";
    setIsEmpty(!hasNoteContent(note));

    void createBlocksuiteAffineEditor(note).then((editor) => {
      if (isDisposed) return;
      editorRef.current = editor;
      mountEditor(host, editor.editor);
      mutationObserver.observe(host, { attributes: true, characterData: true, childList: true, subtree: true });
      host.addEventListener("input", scheduleSave, { signal: abortController.signal });
      host.addEventListener("keyup", scheduleSave, { signal: abortController.signal });
      host.addEventListener("paste", scheduleSave, { signal: abortController.signal });
      host.addEventListener("drop", scheduleSave, { signal: abortController.signal });
    }).catch((error: unknown) => {
      if (isDisposed) return;
      renderEditorError(host, error);
    });

    return () => {
      saveNow();
      isDisposed = true;
      abortController.abort();
      mutationObserver.disconnect();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      editorRef.current = null;
      host.replaceChildren();
    };
  }, [note, saveNow, scheduleSave]);

  return (
    <div className={NOTE_PAGE_ROOT_CLASS_NAME}>
      <div className={NOTE_PAGE_CONTAINER_CLASS_NAME}>
        <button type="button" className={NOTE_ADD_ICON_CLASS_NAME} aria-label={NOTE_ADD_ICON_LABEL}>
          <span className={NOTE_ADD_ICON_MARK_CLASS_NAME} aria-hidden="true">☺</span>
          <span>{NOTE_ADD_ICON_LABEL}</span>
        </button>
        <input className={NOTE_TITLE_INPUT_CLASS_NAME} value={titleValue} placeholder={NOTE_TITLE_PLACEHOLDER} onChange={handleTitleChange} onBlur={saveTitle} onKeyDown={handleTitleKeyDown} aria-label={NOTE_TITLE_PLACEHOLDER} />
        <section className={NOTE_INFO_SECTION_CLASS_NAME} aria-label={NOTE_INFO_LABEL}>
          <div className={NOTE_INFO_HEADER_CLASS_NAME}>
            <span>{NOTE_INFO_LABEL}</span>
            <span className={NOTE_INFO_CHEVRON_CLASS_NAME} aria-hidden="true">‹</span>
          </div>
        </section>
        <section className={NOTE_EDITOR_SECTION_CLASS_NAME} onPointerDown={handleEditorPointerDown}>
          <div ref={hostRef} className={NOTE_EDITOR_HOST_CLASS_NAME} />
          {isEmpty ? <div className={NOTE_EDITOR_PLACEHOLDER_CLASS_NAME}>{NOTE_EMPTY_PLACEHOLDER_LABEL}</div> : null}
        </section>
        <section className={NOTE_LINKS_SECTION_CLASS_NAME} aria-label={NOTE_LINKS_LABEL}>
          <div className={NOTE_LINKS_HEADER_CLASS_NAME}>
            <span>{NOTE_LINKS_LABEL}</span>
            <button type="button" className={NOTE_LINKS_BUTTON_CLASS_NAME}>{NOTE_LINKS_BUTTON_LABEL}</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export { AffineDocumentEditor };
