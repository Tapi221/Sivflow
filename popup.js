const list = document.querySelector("#list");
const statusEl = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh");
const settingsButton = document.querySelector("#settingsButton");
const settingsDialog = document.querySelector("#settingsDialog");
const deleteButtonToggle = document.querySelector("#deleteButtonToggle");
const DELETE_BUTTON_STORAGE_KEY = "showChatDeleteButton";
const approveSelectedButton = document.querySelector("#approveSelected");
const approvalTemplate = document.querySelector("#approvalTemplate");
const emptyTemplate = document.querySelector("#emptyTemplate");
const modeLabel = document.querySelector("#modeLabel");
const modeInputs = Array.from(document.querySelectorAll("input[name='approvalMode']"));

let currentItems = [];
let autoRefreshTimer = null;
let refreshInProgress = false;
let currentMode = "manual";
let selectedChatKeys = [];
let currentDeleteButtonVisible = true;

refreshButton.addEventListener("click", async () => {
  await refreshApprovals(true);
});

settingsButton.addEventListener("click", () => {
  renderSettings();
  settingsDialog.showModal();
});

deleteButtonToggle.addEventListener("change", async () => {
  await setDeleteButtonVisible(deleteButtonToggle.checked);
});

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    if (input.checked) {
      setApprovalMode(input.value);
    }
  });
}

approveSelectedButton.addEventListener("click", async () => {
  const checked = Array.from(document.querySelectorAll(".select:checked"));
  if (checked.length === 0) {
    setStatus("選択されていません");
    return;
  }

  approveSelectedButton.disabled = true;
  setStatus(`${checked.length}件を承認中...`);

  for (const checkbox of checked) {
    const item = currentItems.find((candidate) => candidate.key === checkbox.dataset.key);
    if (item) {
      await approveItem(item);
      await sleep(250);
    }
  }

  approveSelectedButton.disabled = false;
  setStatus("承認しました");
  setTimeout(loadApprovals, 700);
});

initialize();
startAutoRefresh();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshApprovals(false);
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

async function refreshApprovals(showStatus) {
  if (refreshInProgress) return;

  refreshInProgress = true;
  if (showStatus) setStatus("更新中...");

  try {
    const response = await chrome.runtime.sendMessage({ type: "REFRESH_ALL" });
    await loadApprovals();

    if (showStatus && response?.ok === false) {
      setStatus(response.error || "更新に失敗しました");
    }
  } catch (error) {
    setStatus(error?.message || "更新に失敗しました");
  } finally {
    refreshInProgress = false;
  }
}

async function loadApprovals() {
  const response = await chrome.runtime.sendMessage({ type: "GET_APPROVALS" });
  currentMode = normalizeMode(response?.mode);
  selectedChatKeys = Array.isArray(response?.selectedChatKeys) ? response.selectedChatKeys : [];
  renderMode();
  const tabs = response?.tabs ?? [];
  currentItems = tabs.flatMap((tab) =>
    tab.approvals.map((approval) => ({
      ...approval,
      tabId: tab.tabId,
      tabTitle: tab.title,
      chatTitle: approval.chatTitle || tab.title,
      chatKey: approval.chatKey || makeFallbackChatKey(approval.chatTitle || tab.title),
      tabUrl: tab.url,
      key: `${tab.tabId}:${approval.id}`
    }))
  );

  render(currentItems);
  setStatus(makeStatusMessage());
}

async function initialize() {
  await loadSettings();
  await loadMode();
  await refreshApprovals(false);
}

async function loadMode() {
  const response = await chrome.runtime.sendMessage({ type: "GET_MODE" });
  currentMode = normalizeMode(response?.mode);
  selectedChatKeys = Array.isArray(response?.selectedChatKeys) ? response.selectedChatKeys : [];
  renderMode();
}

async function setApprovalMode(mode) {
  const previousMode = currentMode;
  currentMode = mode;
  renderMode();
  setStatus(getModeChangeMessage(mode));

  try {
    const response = await chrome.runtime.sendMessage({ type: "SET_MODE", mode });
    if (response?.ok === false) {
      currentMode = previousMode;
      renderMode();
      setStatus(response.error || "切り替えに失敗しました");
      return;
    }

    currentMode = normalizeMode(response?.mode);
    renderMode();
    await refreshApprovals(false);
  } catch (error) {
    currentMode = previousMode;
    renderMode();
    setStatus(error?.message || "切り替えに失敗しました");
  }
}

function renderMode() {
  for (const input of modeInputs) {
    input.checked = input.value === currentMode;
  }

  modeLabel.textContent = getModeLabel(currentMode);
  approveSelectedButton.disabled = currentMode === "all";
  renderSettings();
}

function renderSettings() {
  deleteButtonToggle.checked = currentDeleteButtonVisible;
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(DELETE_BUTTON_STORAGE_KEY);
    currentDeleteButtonVisible = result[DELETE_BUTTON_STORAGE_KEY] !== false;
  } catch (_error) {
    currentDeleteButtonVisible = true;
  }

  renderSettings();
}

async function setDeleteButtonVisible(enabled) {
  const previousValue = currentDeleteButtonVisible;
  currentDeleteButtonVisible = enabled;
  renderSettings();
  setStatus(enabled ? "削除ボタンを表示します" : "削除ボタンを非表示にします");

  try {
    await chrome.storage.local.set({ [DELETE_BUTTON_STORAGE_KEY]: enabled });
  } catch (error) {
    currentDeleteButtonVisible = previousValue;
    renderSettings();
    setStatus(error?.message || "設定の更新に失敗しました");
  }
}

function render(items) {
  list.replaceChildren();
  let renderedCount = 0;

  if (items.length === 0) {
    list.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  for (const item of items) {
    const node = approvalTemplate.content.cloneNode(true);
    const card = node.querySelector(".card");
    const checkbox = node.querySelector(".select");
    const title = node.querySelector(".title");
    const chatName = node.querySelector(".chatName");
    const meta = node.querySelector(".meta");
    const preview = node.querySelector(".preview");
    const chatAuto = node.querySelector(".chatAuto");
    const chatAutoToggle = node.querySelector(".chatAutoToggle");
    const openTab = node.querySelector(".openTab");
    const approve = node.querySelector(".approve");

    if (!card || !checkbox || !title || !meta || !preview || !openTab || !approve) {
      setStatus("カード表示に必要な要素が見つかりません");
      continue;
    }

    card.dataset.key = item.key;
    checkbox.dataset.key = item.key;
    title.textContent = item.title;
    if (chatName) {
      chatName.textContent = `チャット: ${formatChatTitle(item.chatTitle)}`;
    }
    meta.textContent = [item.repo, item.branch && `branch: ${item.branch}`, item.filePath]
      .filter(Boolean)
      .join(" / ");
    preview.textContent = item.preview;
    if (chatAuto && chatAutoToggle) {
      chatAutoToggle.checked = selectedChatKeys.includes(item.chatKey);
      chatAuto.hidden = currentMode === "all";

      chatAutoToggle.addEventListener("change", async () => {
        chatAutoToggle.disabled = true;
        const response = await setChatAuto(item.chatKey, chatAutoToggle.checked);
        chatAutoToggle.disabled = false;

        if (response?.ok === false) {
          chatAutoToggle.checked = !chatAutoToggle.checked;
          setStatus(response.error || "チャット設定の更新に失敗しました");
        }
      });
    }

    openTab.addEventListener("click", () => {
      chrome.tabs.update(item.tabId, { active: true });
    });

    approve.addEventListener("click", async () => {
      approve.disabled = true;
      setStatus("承認中...");
      const result = await approveItem(item);
      approve.disabled = false;
      setStatus(result.ok ? "承認しました" : result.error || "失敗しました");
      setTimeout(loadApprovals, 700);
    });

    list.appendChild(node);
    renderedCount += 1;
  }

  if (renderedCount === 0) {
    list.appendChild(emptyTemplate.content.cloneNode(true));
  }
}

async function approveItem(item) {
  return chrome.runtime.sendMessage({
    type: "APPROVE",
    tabId: item.tabId,
    approvalId: item.id
  });
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function setChatAuto(chatKey, enabled) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SET_CHAT_AUTO",
      chatKey,
      enabled
    });

    if (response?.ok !== false) {
      selectedChatKeys = Array.isArray(response?.selectedChatKeys) ? response.selectedChatKeys : selectedChatKeys;
      renderSettings();
      setStatus(enabled ? "このチャットを自動承認にしました" : "このチャットの自動承認を解除しました");
    }

    return response;
  } catch (error) {
    return { ok: false, error: error?.message || "チャット設定の更新に失敗しました" };
  }
}

function formatChatTitle(title) {
  const normalized = (title || "ChatGPT").replace(/\s*[-–—]\s*ChatGPT\s*$/i, "").trim();
  return normalized || "ChatGPT";
}

function makeFallbackChatKey(title) {
  return `title:${formatChatTitle(title)}`;
}

function normalizeMode(mode) {
  if (mode === "auto" || mode === "all") return "all";
  if (mode === "selected") return "selected";
  return "manual";
}

function getModeLabel(mode) {
  if (mode === "all") return "全て自動承認";
  if (mode === "selected") return "選択したチャットのみ自動承認";
  return "手動承認";
}

function getModeChangeMessage(mode) {
  if (mode === "all") return "全て自動承認に切り替えました";
  if (mode === "selected") return "選択したチャットのみ自動承認に切り替えました";
  return "手動承認に切り替えました";
}

function makeStatusMessage() {
  if (currentMode === "all") return `全て自動承認中 / ${currentItems.length}件`;
  if (currentMode === "selected") return `選択チャットのみ自動承認 / ${currentItems.length}件`;
  return `${currentItems.length}件`;
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = setInterval(() => refreshApprovals(false), 2000);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
