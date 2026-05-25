const list = document.querySelector("#list");
const statusEl = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh");
const approveSelectedButton = document.querySelector("#approveSelected");
const approvalTemplate = document.querySelector("#approvalTemplate");
const emptyTemplate = document.querySelector("#emptyTemplate");

let currentItems = [];

refreshButton.addEventListener("click", async () => {
  setStatus("更新中...");
  await chrome.runtime.sendMessage({ type: "REFRESH_ALL" });
  setTimeout(loadApprovals, 400);
});

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

loadApprovals();

async function loadApprovals() {
  const response = await chrome.runtime.sendMessage({ type: "GET_APPROVALS" });
  const tabs = response?.tabs ?? [];
  currentItems = tabs.flatMap((tab) =>
    tab.approvals.map((approval) => ({
      ...approval,
      tabId: tab.tabId,
      tabTitle: tab.title,
      tabUrl: tab.url,
      key: `${tab.tabId}:${approval.id}`
    }))
  );

  render(currentItems);
  setStatus(`${currentItems.length}件`);
}

function render(items) {
  list.replaceChildren();

  if (items.length === 0) {
    list.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  for (const item of items) {
    const node = approvalTemplate.content.cloneNode(true);
    const card = node.querySelector(".card");
    const checkbox = node.querySelector(".select");
    const title = node.querySelector(".title");
    const meta = node.querySelector(".meta");
    const preview = node.querySelector(".preview");
    const openTab = node.querySelector(".openTab");
    const approve = node.querySelector(".approve");

    card.dataset.key = item.key;
    checkbox.dataset.key = item.key;
    title.textContent = item.title;
    meta.textContent = [item.repo, item.branch && `branch: ${item.branch}`, item.filePath, item.tabTitle]
      .filter(Boolean)
      .join(" / ");
    preview.textContent = item.preview;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
