const APPROVE_WORDS = ["確認する", "Approve", "Confirm", "Allow"];
const REJECT_WORDS = ["拒否する", "Reject", "Deny", "Cancel"];
const TOOL_HINTS = ["GitHub", "repository", "branch", "file", "No sensitive data", "承認"];

let lastSignature = "";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SCAN_APPROVALS") {
    const approvals = scanApprovals();
    sendApprovals(approvals);
    sendResponse({ ok: true, approvals });
    return true;
  }

  if (message?.type === "CLICK_APPROVE") {
    const button = findApprovalButton(message.approvalId);
    if (!button) {
      sendResponse({ ok: false, error: "承認ボタンが見つかりませんでした" });
      return true;
    }

    button.click();
    setTimeout(() => {
      const approvals = scanApprovals();
      sendApprovals(approvals, true);
    }, 500);

    sendResponse({ ok: true });
    return true;
  }
});

const observer = new MutationObserver(() => scheduleScan());
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true
});

let scanTimer = null;
function scheduleScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    const approvals = scanApprovals();
    sendApprovals(approvals);
  }, 350);
}

scheduleScan();

function scanApprovals() {
  return findApprovalCards().map((card, index) => {
    const text = normalize(card.innerText || card.textContent || "");
    const approveButton = findButtonIn(card, APPROVE_WORDS);
    const id = makeApprovalId(text, index);

    if (approveButton) {
      approveButton.dataset.approvalHubId = id;
    }

    return {
      id,
      index,
      title: extractTitle(text),
      repo: matchValue(text, /repository\s+([^\s]+)\s+on\s+branch/i) || matchValue(text, /リポジトリ\s*([^\s]+)/i),
      branch: matchValue(text, /branch\s+([^\s]+)/i),
      filePath: matchValue(text, /file\s+([^\s]+)\s+in\s+repository/i) || matchValue(text, /(src\/[^\s]+|app\/[^\s]+|pages\/[^\s]+|components\/[^\s]+|chatgpt-approval-hub\/[^\s]+)/i),
      preview: text.slice(0, 260),
      canApprove: Boolean(approveButton)
    };
  });
}

function findApprovalCards() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const approveButtons = buttons.filter((button) => includesAny(normalize(button.innerText || button.textContent || ""), APPROVE_WORDS));

  const cards = [];
  for (const button of approveButtons) {
    const card = closestApprovalCard(button);
    if (!card) continue;

    const text = normalize(card.innerText || card.textContent || "");
    if (!looksLikeApprovalCard(text)) continue;
    if (cards.includes(card)) continue;

    cards.push(card);
  }

  return cards;
}

function closestApprovalCard(button) {
  let current = button.parentElement;
  for (let depth = 0; current && depth < 8; depth += 1) {
    const text = normalize(current.innerText || current.textContent || "");
    const hasApprove = includesAny(text, APPROVE_WORDS);
    const hasReject = includesAny(text, REJECT_WORDS);
    const hasToolHint = includesAny(text, TOOL_HINTS);

    if (hasApprove && hasReject && hasToolHint) {
      return current;
    }
    current = current.parentElement;
  }
  return button.closest("[role='dialog']") || button.parentElement;
}

function findApprovalButton(approvalId) {
  const exact = document.querySelector(`button[data-approval-hub-id="${CSS.escape(approvalId)}"]`);
  if (exact) return exact;

  return findApprovalCards()
    .map((card) => findButtonIn(card, APPROVE_WORDS))
    .find(Boolean);
}

function findButtonIn(root, words) {
  return Array.from(root.querySelectorAll("button"))
    .find((button) => includesAny(normalize(button.innerText || button.textContent || ""), words));
}

function looksLikeApprovalCard(text) {
  return includesAny(text, APPROVE_WORDS) &&
    includesAny(text, REJECT_WORDS) &&
    includesAny(text, TOOL_HINTS);
}

function sendApprovals(approvals, force = false) {
  const signature = JSON.stringify(approvals.map((item) => `${item.id}:${item.preview}`));
  if (!force && signature === lastSignature) return;
  lastSignature = signature;
  chrome.runtime.sendMessage({ type: "APPROVALS_FOUND", approvals });
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractTitle(text) {
  const title = matchValue(text, /(Update\s+[^?]+\?|Create\s+[^?]+\?|Delete\s+[^?]+\?)/i);
  return title || text.slice(0, 80) || "承認待ち";
}

function matchValue(text, regex) {
  const match = text.match(regex);
  return match?.[1]?.replace(/[.,。]$/, "") ?? "";
}

function makeApprovalId(text, index) {
  let hash = 0;
  const value = `${location.href}:${index}:${text}`;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return `approval-${Math.abs(hash)}`;
}
