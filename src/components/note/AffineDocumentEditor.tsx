import { useCallback, useEffect, useRef, useState } from "react";
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
const NOTE_EDITOR_TOOLBAR_CLASS_NAME = "absolute right-4 top-4 z-20 flex items-center gap-1 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.9)] p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl";
const NOTE_EDITOR_TOOLBAR_BUTTON_CLASS_NAME = "flex h-7 items-center justify-center rounded-[7px] px-2.5 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#4f5661] outline-none transition hover:bg-[#f1f3f4] hover:text-[#202124] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7dbe0]";
const NOTE_LOADING_LABEL = "AFFiNE を読み込み中";
const NOTE_ERROR_LABEL = "AFFiNE エディタを起動できませんでした。Console の BlockSuite エラーを確認してください。";
const NOTE_EMPTY_PLACEHOLDER_LABEL = "ここから入力";
const NOTE_INSERT_TABLE_LABEL = "表";
const NOTE_TABLE_SLASH_FILTER = "/table";

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

const getEditableElement = (editor: BlocksuiteAffineEditor["editor"]): HTMLElement => editor.querySelector<HTMLElement>("[contenteditable='true']") ?? editor;

const placeCaretAtEnd = (target: HTMLElement): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount > 0) return;
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const insertTextAtCurrentSelection = (text: string): boolean => document.execCommand("insertText", false, text);

const openBlocksuiteSlashMenu = (editor: BlocksuiteAffineEditor["editor"], filterText: string): void => {
  const target = getEditableElement(editor);
  target.focus({ preventScroll: true });

  window.setTimeout(() => {
    target.focus({ preventScroll: true });
    placeCaretAtEnd(target);
    if (insertTextAtCurrentSelection(filterText)) return;
    target.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, data: filterText, inputType: "insertText" }));
    target.dispatchEvent(new InputEvent("input", { bubbles: true, data: filterText, inputType: "insertText" }));
  }, 0);
};

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<BlocksuiteAffineEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);
  const latestSavedTextRef = useRef<string>(note.contentText ?? "");
  const [isEmpty, setIsEmpty] = useState(() => !hasNoteContent(note));

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

  const handleOpenTableSlashMenu = useCallback(() => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    openBlocksuiteSlashMenu(editor, NOTE_TABLE_SLASH_FILTER);
    scheduleSave();
  }, [scheduleSave]);

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
    <div className={NOTE_EDITOR_ROOT_CLASS_NAME}>
      <div ref={hostRef} className={NOTE_EDITOR_HOST_CLASS_NAME} />
      <div className={NOTE_EDITOR_TOOLBAR_CLASS_NAME} aria-label="ノート挿入ツール">
        <button type="button" className={NOTE_EDITOR_TOOLBAR_BUTTON_CLASS_NAME} onClick={handleOpenTableSlashMenu} title="/table で表ブロックを検索">
          {NOTE_INSERT_TABLE_LABEL}
        </button>
      </div>
      {isEmpty ? <div className={NOTE_EDITOR_PLACEHOLDER_CLASS_NAME}>{NOTE_EMPTY_PLACEHOLDER_LABEL}</div> : null}
    </div>
  );
};

export { AffineDocumentEditor };
