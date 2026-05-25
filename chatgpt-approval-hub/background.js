const approvalsByTab = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "APPROVALS_FOUND") {
    const tabId = sender.tab?.id;
    if (typeof tabId === "number") {
      approvalsByTab.set(tabId, {
        tabId,
        title: sender.tab?.title ?? "ChatGPT",
        url: sender.tab?.url ?? "",
        approvals: message.approvals ?? [],
        updatedAt: Date.now()
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "GET_APPROVALS") {
    sendResponse({
      ok: true,
      tabs: Array.from(approvalsByTab.values())
        .filter((item) => item.approvals.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    });
    return true;
  }

  if (message?.type === "APPROVE") {
    chrome.tabs.sendMessage(
      message.tabId,
      { type: "CLICK_APPROVE", approvalId: message.approvalId },
      (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse(response ?? { ok: false, error: "No response from tab" });
      }
    );
    return true;
  }

  if (message?.type === "REFRESH_ALL") {
    refreshAllChatGptTabs().then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  approvalsByTab.delete(tabId);
});

async function refreshAllChatGptTabs() {
  const tabs = await chrome.tabs.query({});
  const targets = tabs.filter((tab) =>
    tab.url?.startsWith("https://chatgpt.com/") ||
    tab.url?.startsWith("https://chat.openai.com/")
  );

  await Promise.allSettled(
    targets.map((tab) =>
      chrome.tabs.sendMessage(tab.id, { type: "SCAN_APPROVALS" })
    )
  );
}
