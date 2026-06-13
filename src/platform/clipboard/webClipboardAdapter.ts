import type { ClipboardAdapter } from "./clipboardAdapter";



const webClipboardAdapter: ClipboardAdapter = { async writeText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fallback へ
    }
  }

  const copied = fallbackCopyText(text);
  if (!copied) {
    throw new Error("Clipboard write failed");
  }
},
};



const fallbackCopyText = (text: string): boolean => {
  if (typeof document === "undefined") return false;

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.left = "-9999px";

  document.body.appendChild(el);
  el.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(el);
  }

  return copied;
};



export { webClipboardAdapter };
