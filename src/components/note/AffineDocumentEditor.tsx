import { useCallback, useEffect, useMemo, useRef } from "react";
import { createBlocksuiteAffineEditor, createBlocksuiteNoteContent, readBlocksuiteText, type BlocksuiteAffineEditor } from "./AffineDocumentEditor.blocksuite";
import type { Note } from "@/types";

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_EDITOR_ROOT_CLASS_NAME = "relative h-full min-h-0 w-full overflow-hidden bg-white text-[#202124]";
const NOTE_EDITOR_HOST_CLASS_NAME = "h-full min-h-0 w-full overflow-hidden bg-white";
const NOTE_EDITOR_LOADING_CLASS_NAME = "flex h-full w-full items-center justify-center bg-white text-[#9aa0a6]";
const NOTE_EDITOR_LOADING_SPINNER_CLASS_NAME = "h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent";
const NOTE_EDITOR_ERROR_CLASS_NAME = "flex h-full w-full items-center justify-center bg-white px-6 text-center text-[12px] font-medium text-[#9aa0a6]";
const NOTE_EDITOR_PLACEHOLDER_CLASS_NAME = "pointer-events-none absolute left-[72px] top-[72px] z-10 select-none text-[15px] font-medium tracking-[-0.01em] text-[#9aa0a6]";
const NOTE_LOADING_LABEL = "AFFiNE を読み込み中";
const NOTE_ERROR_LABEL = "AFFiNE エディタを起動できませんでした。Console の BlockSuite エラーを確認してください。";
const NOTE_EMPTY_PLACEHOLDER_LABEL = "ここから入力";

const hasNoteContent = (note: Note): boolean => Boolean(note.contentText?.trim());

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

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<BlocksuiteAffineEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);
  const latestSavedTextRef = useRef<string>(note.contentText ?? "");
  const [isEmpty, setIsEmpty] = useMemo(() => [!hasNoteContent(note), (nextIsEmpty: boolean) => void nextIsEmpty] as const, [note]);

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
  }, [setIsEmpty]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(saveNow, NOTE_SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let isDisposed = false;
    const abortController = new AbortController();
    const mutationObserver = new MutationObserver(scheduleSave);

    editorRef.current = null;
    renderLoadingSpinner(host);
    latestSavedTextRef.current = note.contentText ?? "";

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
    <div className={NOTE_EDITOR_ROOT_CLASS_NAME}>
      <div ref={hostRef} className={NOTE_EDITOR_HOST_CLASS_NAME} />
      {isEmpty ? <div className={NOTE_EDITOR_PLACEHOLDER_CLASS_NAME}>{NOTE_EMPTY_PLACEHOLDER_LABEL}</div> : null}
    </div>
  );
};

export { AffineDocumentEditor };
