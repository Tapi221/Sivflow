type ElementRectListener = () => void;



const listenerMap = new WeakMap<Element, Set<ElementRectListener>>();
let resizeObserver: ResizeObserver | null = null;



const notifyListeners = (element: Element) => {
  const listeners = listenerMap.get(element);
  if (!listeners) {
    return;
  }

  listeners.forEach((listener) => {
    listener();
  });
};
const ensureResizeObserver = () => {
  if (resizeObserver || typeof ResizeObserver === "undefined") {
    return resizeObserver;
  }

  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      notifyListeners(entry.target);
    });
  });

  return resizeObserver;
};
const observeElementRect = (element: Element, listener: ElementRectListener) => {
  const listeners = listenerMap.get(element) ?? new Set<ElementRectListener>();
  listeners.add(listener);
  listenerMap.set(element, listeners);

  const observer = ensureResizeObserver();
  observer?.observe(element);

  return () => {
    const currentListeners = listenerMap.get(element);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);

    if (currentListeners.size > 0) {
      return;
    }

    listenerMap.delete(element);
    observer?.unobserve(element);
  };
};



export { observeElementRect };
