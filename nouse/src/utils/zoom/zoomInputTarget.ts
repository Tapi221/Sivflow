const BASE_ZOOM_INPUT_IGNORE_SELECTORS = ["input", "textarea", "select", "button", "summary", "a[href]", "[role=button]", "[role=slider]", "[contenteditable]:not([contenteditable=false])"];
const DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR = BASE_ZOOM_INPUT_IGNORE_SELECTORS.join(",");



const resolveEventTargetElement = (target: EventTarget | null): Element | null => {
  if (typeof Element !== "undefined" && target instanceof Element) {
    return target;
  }
  if (typeof Node !== "undefined" && target instanceof Node) {
    return target.parentElement;
  }
  return null;
};
const shouldHandleZoomInputTarget = ({ container, target, ignoreSelector = DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR }: { container: HTMLElement | null; target: EventTarget | null; ignoreSelector?: string }) => {
  if (!container) return false;
  const targetElement = resolveEventTargetElement(target);
  if (!targetElement) return false;
  if (!container.contains(targetElement)) return false;
  return targetElement.closest(ignoreSelector) === null;
};



export { DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR, resolveEventTargetElement, shouldHandleZoomInputTarget };
