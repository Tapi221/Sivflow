(() => {
  const STATE_KEY = "__chatgptApprovalHubDeleteButtonVisibilityState";
  const previousState = globalThis[STATE_KEY];
  if (previousState?.stop) {
    previousState.stop();
  }

  const DELETE_BUTTON_STORAGE_KEY = "showChatDeleteButton";
  const STYLE_ID = "chatgpt-approval-hub-delete-button-visibility-style";
  const BUTTON_ID = "chatgpt-approval-hub-chat-delete-button";
  const STATUS_ID = "chatgpt-approval-hub-chat-delete-status";

  const state = {
    stopped: false,
    stop
  };
  globalThis[STATE_KEY] = state;

  syncVisibility();

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(handleStorageChange);
  }

  async function syncVisibility() {
    const visible = await loadVisibility();
    if (state.stopped) return;

    setDeleteButtonVisible(visible);
  }

  async function loadVisibility() {
    try {
      const result = await chrome.storage.local.get(DELETE_BUTTON_STORAGE_KEY);
      return result[DELETE_BUTTON_STORAGE_KEY] !== false;
    } catch (_error) {
      return true;
    }
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes[DELETE_BUTTON_STORAGE_KEY]) return;

    setDeleteButtonVisible(changes[DELETE_BUTTON_STORAGE_KEY].newValue !== false);
  }

  function setDeleteButtonVisible(visible) {
    if (visible) {
      removeHiddenStyle();
      return;
    }

    injectHiddenStyle();
  }

  function injectHiddenStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID},
      #${STATUS_ID} {
        display: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function removeHiddenStyle() {
    document.getElementById(STYLE_ID)?.remove();
  }

  function stop() {
    state.stopped = true;
    removeHiddenStyle();

    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }
})();
