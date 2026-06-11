type NativeTitleTooltipGlobal = typeof globalThis & {
  __sivflowNativeTitleTooltipDisablerInstalled?: boolean;
};



const INSTALL_KEY = "__sivflowNativeTitleTooltipDisablerInstalled";
const TITLE_BACKUP_ATTRIBUTE = "data-native-title";



const stripNativeTitle = (element: Element) => {
  const title = element.getAttribute("title");
  if (title === null) return;

  if (title && !element.hasAttribute(TITLE_BACKUP_ATTRIBUTE)) {
    element.setAttribute(TITLE_BACKUP_ATTRIBUTE, title);
  }

  element.removeAttribute("title");
};
const stripNativeTitles = (root: ParentNode) => {
  if (root instanceof Element) {
    stripNativeTitle(root);
  }

  root.querySelectorAll("[title]").forEach(stripNativeTitle);
};
const stripNativeTitleFromEventTarget = (event: Event) => {
  if (!(event.target instanceof Element)) return;

  const titledElement = event.target.closest("[title]");
  if (!titledElement) return;

  stripNativeTitle(titledElement);
};
const observeNativeTitleChanges = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        stripNativeTitle(mutation.target);
        return;
      }

      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          stripNativeTitles(node);
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    attributeFilter: ["title"],
    attributes: true,
    childList: true,
    subtree: true,
  });
};
const installNativeTitleTooltipDisabler = () => {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

  const nativeTitleTooltipGlobal = globalThis as NativeTitleTooltipGlobal;
  if (nativeTitleTooltipGlobal[INSTALL_KEY]) return;

  nativeTitleTooltipGlobal[INSTALL_KEY] = true;

  stripNativeTitles(document);
  document.addEventListener("mouseover", stripNativeTitleFromEventTarget, true);
  document.addEventListener("focusin", stripNativeTitleFromEventTarget, true);
  observeNativeTitleChanges();
};
installNativeTitleTooltipDisabler();
