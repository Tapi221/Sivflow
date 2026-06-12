const TYPING_TARGET_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const TYPING_TARGET_ROLES = new Set(["textbox", "combobox", "searchbox"]);



const isHTMLElement = (target: EventTarget | null): target is HTMLElement => target instanceof HTMLElement;
const isTypingTarget = (target: EventTarget | null) => {
  if (!isHTMLElement(target)) return false;
  if (target.closest("[data-prevent-hotkeys=\"true\"]")) return true;
  if (TYPING_TARGET_TAG_NAMES.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable=\"true\"]")) return true;

  const role = target.getAttribute("role");
  if (role && TYPING_TARGET_ROLES.has(role)) return true;

  return false;
};
const hasPrimaryModifier = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;
const isPrimaryShortcut = (event: KeyboardEvent, key: string) => {
  return hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === key.toLowerCase();
};
const isPrimaryShiftShortcut = (event: KeyboardEvent, key: string) => {
  return hasPrimaryModifier(event) && !event.altKey && event.shiftKey && event.key.toLowerCase() === key.toLowerCase();
};



export { isTypingTarget, hasPrimaryModifier, isPrimaryShortcut, isPrimaryShiftShortcut };
