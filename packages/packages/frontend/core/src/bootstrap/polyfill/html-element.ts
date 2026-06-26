if (typeof globalThis.HTMLElement === 'undefined') {
  (globalThis as any).HTMLElement = class HTMLElement {};
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: { style: {} },
    createElement: () => ({ style: {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
