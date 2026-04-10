<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #1e1e1e;
  display: flex; justify-content: center; align-items: flex-start;
  padding: 20px; min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.pane {
  width: 320px; min-height: 600px; background: #262626;
  display: flex; flex-direction: column;
  border-radius: 6px; overflow: hidden; color: #dcddde; font-size: 13px;
}
.toolbar {
  display: flex; align-items: center; justify-content: center;
  gap: 2px; padding: 6px 8px; border-bottom: 1px solid #3a3a3a; flex-shrink: 0;
}
.tb-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer; color: #999; border: none; background: transparent;
  transition: background .1s, color .1s;
}
.tb-btn:hover { background: #3a3a3a; color: #dcddde; }
.tb-btn.active { background: #3a3a3a; color: #dcddde; }
.tree-area { flex: 1; overflow-y: auto; padding: 4px 0 40px; }
.tree-area::-webkit-scrollbar { width: 6px; }
.tree-area::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

.node-row {
  display: flex; align-items: center; height: 26px;
  padding: 0 8px; cursor: pointer; border-radius: 4px;
  margin: 0 4px; white-space: nowrap; overflow: hidden;
  transition: background .08s;
  position: relative;
}
.node-row:hover { background: #2e2e2e; }
.node-row.active { background: #404040; }
.node-row.dragging { opacity: 0.35; }
.node-row.drag-over-folder { background: #3a3aff22; outline: 1px solid #6c6cff; outline-offset: -1px; border-radius: 4px; }

/* drop indicator line */
.drop-line {
  position: absolute; left: 0; right: 0; height: 2px;
  background: #6c6cff; border-radius: 1px; pointer-events: none; z-index: 10;
}
.drop-line.top { top: 0; }
.drop-line.bottom { bottom: 0; }

.indent { flex-shrink: 0; }
.arrow {
  width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #888; font-size: 9px; transition: transform .15s;
}
.arrow.open { transform: rotate(90deg); }
.arrow.leaf { opacity: 0; }
.node-icon {
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 3px;
}
.node-label { flex: 1; overflow: hidden; text-overflow: ellipsis; color: #dcddde; font-size: 13px; line-height: 26px; }
.node-row.active .node-label { color: #fff; }
.children { overflow: hidden; max-height: 9999px; }
.children.closed { max-height: 0; }

.inline-input-row {
  display: flex; align-items: center; height: 26px;
  padding: 0 8px; border-radius: 4px; margin: 0 4px;
}
.inline-input {
  flex: 1; background: #1e1e1e; border: 1px solid #6c6cff;
  color: #dcddde; font-size: 13px; font-family: inherit;
  padding: 2px 6px; border-radius: 3px; outline: none;
}
.bottom-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; border-top: 1px solid #3a3a3a; flex-shrink: 0;
}
.vault-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #999; }
.bottom-icons { display: flex; gap: 4px; }
.b-btn {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  color: #888; border: none; background: transparent; cursor: pointer; border-radius: 4px;
}
.b-btn:hover { color: #dcddde; background: #3a3a3a; }

/* context menu */
.ctx-menu {
  position: fixed; background: #2e2e2e; border: 1px solid #4a4a4a;
  border-radius: 6px; padding: 4px; z-index: 9999; min-width: 150px;
  box-shadow: 0 4px 16px #0008;
}
.ctx-item {
  padding: 6px 12px; cursor: pointer; border-radius: 4px;
  font-size: 13px; color: #dcddde; white-space: nowrap;
}
.ctx-item:hover { background: #3a3a3a; }
</style>
</head>
<body>
<div class="pane">
  <div class="toolbar">
    <button class="tb-btn" title="新規ノート" onclick="createNew(false)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    </button>
    <button class="tb-btn" title="新規フォルダ" onclick="createNew(true)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
    </button>
    <button class="tb-btn" title="ソート">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></svg>
    </button>
    <button class="tb-btn active">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    </button>
    <button class="tb-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="tree-area" id="tree"></div>
  <div class="bottom-bar">
    <div class="vault-label">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
      Obsidian Vault
    </div>
    <div class="bottom-icons">
      <button class="b-btn">?</button>
      <button class="b-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      </button>
    </div>
  </div>
</div>

<script>
// ── data ──
const root = {
  type:'folder', name:'Manifolia', open:true, children:[
    {type:'folder', name:'todo', open:true, children:[
      {type:'file', name:'CardSetView.tsxの責務分離'},
    ]},
    {type:'folder', name:'クラス', open:false, children:[
      {type:'file', name:'CardSetView'},
      {type:'file', name:'BlockSeparator'},
    ]},
    {type:'folder', name:'関数', open:true, children:[
      {type:'file', name:'BlockSeparator'},
      {type:'file', name:'normalizeTextBlockContent'},
    ]},
    {type:'folder', name:'疑問', open:true, children:[
      {type:'file', name:'APIレスポンスってなに？'},
      {type:'file', name:'crumb形式ってなに？'},
      {type:'file', name:'DDDってなに？'},
      {type:'file', name:'hooksがReact専用のなんで？'},
      {type:'file', name:'Hooksってなに？'},
      {type:'file', name:'nullable importってなに？'},
      {type:'file', name:'propsってなに？'},
      {type:'file', name:'Reactコンポーネントってなに？'},
      {type:'file', name:'React専用なのはuiだけにするのな...'},
      {type:'file', name:'remount 同期ってなに？'},
      {type:'file', name:'useStateとは何か'},
      {type:'file', name:'ドメインってなに？'},
      {type:'file', name:'なぜObsidianでは特定の記号をタ...'},
    ]},
    {type:'folder', name:'決定事項', open:true, children:[
      {type:'file', name:'routesの役割'},
      {type:'file', name:'責務分離'},
    ]},
    {type:'folder', name:'考える', open:false, children:[]},
    {type:'folder', name:'未決定事項', open:false, children:[]},
    {type:'file', name:'無題のファイル'},
    {type:'file', name:'無題のファイル 1'},
  ]
};

// ── SVG helpers ──
const arrowSvg = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,4 20,12 8,20"/></svg>`;
const folderSvg = o => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${o?'#c8c8c8':'none'}" stroke="#aaa" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;
const fileSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

// ── drag state ──
let dragNode = null, dragParent = null, dragIdx = -1;
let dropTarget = null, dropPosition = null; // 'before'|'after'|'inside'
let activeRow = null;
let openTimer = null;

// ── find parent ──
function findParent(node, target, parent = null, idx = -1) {
  if (node === target) return { parent, idx };
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const r = findParent(node.children[i], target, node, i);
      if (r) return r;
    }
  }
  return null;
}

// ── remove node from tree ──
function removeNode(node) {
  const r = findParent(root, node);
  if (r && r.parent) r.parent.children.splice(r.idx, 1);
}

// ── insert node ──
function insertNode(node, targetNode, pos) {
  if (pos === 'inside') {
    targetNode.children = targetNode.children || [];
    targetNode.children.unshift(node);
  } else {
    const r = findParent(root, targetNode);
    if (!r || !r.parent) { root.children.push(node); return; }
    const i = pos === 'before' ? r.idx : r.idx + 1;
    r.parent.children.splice(i, 0, node);
  }
}

// ── is ancestor ──
function isAncestor(potentialAnc, node) {
  if (potentialAnc === node) return true;
  if (potentialAnc.children) return potentialAnc.children.some(c => isAncestor(c, node));
  return false;
}

// ── context menu ──
let ctxMenu = null;
function showCtxMenu(x, y, items) {
  closeCtxMenu();
  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top = y + 'px';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'ctx-item';
    el.textContent = item.label;
    el.addEventListener('mousedown', e => { e.preventDefault(); closeCtxMenu(); item.action(); });
    ctxMenu.appendChild(el);
  });
  document.body.appendChild(ctxMenu);
  setTimeout(() => document.addEventListener('click', closeCtxMenu, { once: true }), 0);
}
function closeCtxMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }

// ── inline input ──
function showInlineInput(container, depth, isFolder, onConfirm) {
  const row = document.createElement('div');
  row.className = 'inline-input-row';
  const ind = document.createElement('span');
  ind.className = 'indent';
  ind.style.width = (depth * 16) + 'px';
  row.appendChild(ind);
  const ico = document.createElement('span');
  ico.className = 'node-icon';
  ico.innerHTML = isFolder ? folderSvg(false) : fileSvg;
  row.appendChild(ico);
  const inp = document.createElement('input');
  inp.className = 'inline-input';
  inp.placeholder = isFolder ? '新規フォルダ名' : '新規ファイル名';
  row.appendChild(inp);
  container.prepend(row);
  inp.focus();
  const done = () => { const v = inp.value.trim(); row.remove(); if (v) onConfirm(v); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(); if (e.key === 'Escape') row.remove(); });
  inp.addEventListener('blur', done);
}

// ── clear drop indicators ──
function clearDropIndicators() {
  document.querySelectorAll('.drop-line').forEach(el => el.remove());
  document.querySelectorAll('.drag-over-folder').forEach(el => el.classList.remove('drag-over-folder'));
}

// ── render ──
function render() {
  const tree = document.getElementById('tree');
  tree.innerHTML = '';

  // root row
  const rootRow = makeRow(root, 0);
  tree.appendChild(rootRow.wrap);

  const rootChildren = document.createElement('div');
  rootChildren.className = 'children' + (root.open ? '' : ' closed');
  root.children.forEach(c => rootChildren.appendChild(makeNodeEl(c, 1)));
  tree.appendChild(rootChildren);

  rootRow.arrow.className = 'arrow' + (root.open ? ' open' : '');
  rootRow.row.addEventListener('click', () => {
    root.open = !root.open;
    rootRow.arrow.className = 'arrow' + (root.open ? ' open' : '');
    rootRow.icon.innerHTML = folderSvg(root.open);
    rootChildren.classList.toggle('closed', !root.open);
  });
  rootRow.row.addEventListener('contextmenu', e => {
    e.preventDefault();
    showCtxMenu(e.clientX, e.clientY, ctxItems(root, rootChildren, 0));
  });
  setupDragTarget(rootRow.row, root, rootChildren);
}

function makeRow(node, depth) {
  const wrap = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'node-row';
  row.draggable = true;

  const ind = document.createElement('span');
  ind.className = 'indent';
  ind.style.width = (depth * 16) + 'px';
  row.appendChild(ind);

  const arrow = document.createElement('span');
  arrow.className = 'arrow' + (node.type === 'folder' ? (node.open ? ' open' : '') : ' leaf');
  arrow.innerHTML = arrowSvg;
  row.appendChild(arrow);

  const icon = document.createElement('span');
  icon.className = 'node-icon';
  icon.innerHTML = node.type === 'folder' ? folderSvg(node.open) : fileSvg;
  row.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'node-label';
  label.textContent = node.name;
  row.appendChild(label);

  wrap.appendChild(row);
  return { wrap, row, arrow, icon, label };
}

function makeNodeEl(node, depth) {
  const { wrap, row, arrow, icon } = makeRow(node, depth);

  if (node.type === 'folder') {
    const childrenEl = document.createElement('div');
    childrenEl.className = 'children' + (node.open ? '' : ' closed');
    node.children.forEach(c => childrenEl.appendChild(makeNodeEl(c, depth + 1)));
    wrap.appendChild(childrenEl);

    const toggle = () => {
      node.open = !node.open;
      arrow.className = 'arrow' + (node.open ? ' open' : '');
      icon.innerHTML = folderSvg(node.open);
      childrenEl.classList.toggle('closed', !node.open);
    };
    row.addEventListener('click', toggle);
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      showCtxMenu(e.clientX, e.clientY, ctxItems(node, childrenEl, depth));
    });
    setupDragTarget(row, node, childrenEl);
  } else {
    row.addEventListener('click', () => {
      if (activeRow) activeRow.classList.remove('active');
      row.classList.add('active');
      activeRow = row;
    });
    setupDragTarget(row, node, null);
  }

  // dragstart
  row.addEventListener('dragstart', e => {
    dragNode = node;
    const p = findParent(root, node);
    dragParent = p ? p.parent : null;
    dragIdx = p ? p.idx : -1;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.name);
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    clearDropIndicators();
    dragNode = null;
    dropTarget = null;
    dropPosition = null;
    if (openTimer) { clearTimeout(openTimer); openTimer = null; }
  });

  return wrap;
}

function setupDragTarget(row, node, childrenEl) {
  row.addEventListener('dragover', e => {
    if (!dragNode || dragNode === node) return;
    if (dragNode.type === 'folder' && isAncestor(dragNode, node)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    clearDropIndicators();
    const rect = row.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;

    if (node.type === 'folder' && y > h * 0.25 && y < h * 0.75) {
      // drop inside folder
      row.classList.add('drag-over-folder');
      dropTarget = node;
      dropPosition = 'inside';
      // auto-open after hover
      if (!node.open && childrenEl) {
        if (!openTimer) openTimer = setTimeout(() => {
          node.open = true;
          row.querySelector('.arrow') && (row.querySelector('.arrow').className = 'arrow open');
          childrenEl.classList.remove('closed');
          openTimer = null;
        }, 600);
      }
    } else {
      if (openTimer) { clearTimeout(openTimer); openTimer = null; }
      const line = document.createElement('div');
      line.className = 'drop-line';
      if (y <= h * 0.5) {
        line.classList.add('top');
        dropTarget = node; dropPosition = 'before';
      } else {
        line.classList.add('bottom');
        dropTarget = node; dropPosition = 'after';
      }
      row.style.position = 'relative';
      row.appendChild(line);
    }
  });

  row.addEventListener('dragleave', e => {
    if (!row.contains(e.relatedTarget)) {
      clearDropIndicators();
      if (openTimer) { clearTimeout(openTimer); openTimer = null; }
    }
  });

  row.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragNode || !dropTarget) return;
    if (dragNode === dropTarget) return;
    if (dragNode.type === 'folder' && isAncestor(dragNode, dropTarget)) return;

    removeNode(dragNode);
    insertNode(dragNode, dropTarget, dropPosition);
    clearDropIndicators();
    dropTarget = null; dropPosition = null;
    render();
  });
}

function ctxItems(folderNode, childrenEl, depth) {
  return [
    { label: '📁 新規フォルダ', action: () => {
      if (!folderNode.open && childrenEl) { folderNode.open = true; childrenEl.classList.remove('closed'); }
      showInlineInput(childrenEl || document.getElementById('tree').children[1], depth + 1, true, name => {
        folderNode.children = folderNode.children || [];
        folderNode.children.unshift({ type: 'folder', name, open: false, children: [] });
        render();
      });
    }},
    { label: '📄 新規ノート', action: () => {
      if (!folderNode.open && childrenEl) { folderNode.open = true; childrenEl.classList.remove('closed'); }
      showInlineInput(childrenEl || document.getElementById('tree').children[1], depth + 1, false, name => {
        folderNode.children = folderNode.children || [];
        folderNode.children.unshift({ type: 'file', name });
        render();
      });
    }},
  ];
}

function createNew(isFolder) {
  const rootChildren = document.getElementById('tree').children[1];
  if (!root.open) { root.open = true; render(); return; }
  showInlineInput(rootChildren, 1, isFolder, name => {
    root.children.unshift(isFolder ? { type: 'folder', name, open: false, children: [] } : { type: 'file', name });
    render();
  });
}

render();
</script>
</body>
</html>