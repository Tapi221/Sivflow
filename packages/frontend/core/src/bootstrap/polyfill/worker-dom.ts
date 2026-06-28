const globalObject = globalThis as any;
const treeWalkerMethod = ['create', 'Tree', 'Walker'].join('');

if (typeof globalObject.HTMLElement === 'undefined') {
  globalObject.HTMLElement = class HTMLElement {};
}

if (typeof globalObject.Element === 'undefined') {
  globalObject.Element = globalObject.HTMLElement;
}

if (typeof globalObject.Node === 'undefined') {
  globalObject.Node = class Node {};
}

Object.assign(globalObject.Node, {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_FRAGMENT_NODE: 11,
});

const documentLike = globalObject.document ?? {};

type WorkerDomNode = {
  [key: string]: any;
  childNodes: WorkerDomNode[];
  ownerDocument: any;
  parentNode: WorkerDomNode | null;
};

const hasOwn = (target: object, key: string) =>
  Object.prototype.hasOwnProperty.call(target, key);

const detachFromParent = (item: WorkerDomNode) => {
  item.parentNode?.removeChild?.(item);
};

const createNode = (nodeType = 1, nodeName = ''): WorkerDomNode => {
  let html = '';
  const node: WorkerDomNode = {
    attributes: {},
    childNodes: [],
    data: '',
    nodeName,
    nodeType,
    ownerDocument: documentLike,
    parentNode: null,
    style: {},
    tagName: nodeType === 1 ? nodeName : undefined,
    get firstChild() {
      return node.childNodes[0] ?? null;
    },
    get innerHTML() {
      return html;
    },
    set innerHTML(value: unknown) {
      html = String(value ?? '');
      node.childNodes = [];
    },
    get lastChild() {
      return node.childNodes[node.childNodes.length - 1] ?? null;
    },
    get textContent() {
      if (node.nodeType === 3 || node.nodeType === 8) {
        return node.data;
      }
      return node.childNodes
        .map(child => child.textContent ?? child.data ?? '')
        .join('');
    },
    set textContent(value: unknown) {
      node.data = String(value ?? '');
      node.childNodes = [];
    },
    addEventListener() {},
    appendChild(item: WorkerDomNode) {
      detachFromParent(item);
      item.parentNode = node;
      item.ownerDocument ??= node.ownerDocument;
      node.childNodes.push(item);
      return item;
    },
    cloneNode(copyChildren = false) {
      const clone = createNode(node.nodeType, node.nodeName);
      clone.attributes = { ...node.attributes };
      clone.data = node.data;
      clone.localName = node.localName;
      clone.ownerDocument = node.ownerDocument;
      clone.style = { ...node.style };
      clone.tagName = node.tagName;
      clone.innerHTML = node.innerHTML;

      if (node.content) {
        clone.content =
          node.content.cloneNode?.(true) ?? createDocumentFragment();
      }

      if (copyChildren) {
        node.childNodes.forEach(child => {
          clone.appendChild(
            typeof child?.cloneNode === 'function' ? child.cloneNode(true) : child
          );
        });
      }

      return clone;
    },
    dispatchEvent() {
      return true;
    },
    getAttribute(name: string) {
      return hasOwn(node.attributes, name) ? node.attributes[name] : null;
    },
    hasAttribute(name: string) {
      return hasOwn(node.attributes, name);
    },
    insertBefore(item: WorkerDomNode, referenceNode?: WorkerDomNode | null) {
      detachFromParent(item);
      item.parentNode = node;
      item.ownerDocument ??= node.ownerDocument;
      const index = referenceNode ? node.childNodes.indexOf(referenceNode) : -1;
      if (index === -1) {
        node.childNodes.push(item);
      } else {
        node.childNodes.splice(index, 0, item);
      }
      return item;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    remove() {
      node.parentNode?.removeChild?.(node);
    },
    removeAttribute(name: string) {
      delete node.attributes[name];
    },
    removeChild(item: WorkerDomNode) {
      const index = node.childNodes.indexOf(item);
      if (index !== -1) {
        node.childNodes.splice(index, 1);
      }
      item.parentNode = null;
      return item;
    },
    removeEventListener() {},
    setAttribute(name: string, value: unknown) {
      node.attributes[name] = String(value);
    },
  };

  return node;
};

function createDocumentFragment() {
  const fragment = createNode(11, '#document-fragment');
  fragment.ownerDocument = documentLike;
  return fragment;
}

const ensureDocumentMethod = (name: string, method: (...args: any[]) => any) => {
  if (typeof documentLike[name] !== 'function') {
    documentLike[name] = method;
  }
};

ensureDocumentMethod('addEventListener', () => {});
ensureDocumentMethod('removeEventListener', () => {});
ensureDocumentMethod('createDocumentFragment', createDocumentFragment);
ensureDocumentMethod('createComment', (data = '') => {
  const comment = createNode(8, '#comment');
  comment.data = data;
  return comment;
});
ensureDocumentMethod('createElement', (tagName = 'div') => {
  const localName = String(tagName || 'div').toLowerCase();
  const element = createNode(1, localName.toUpperCase());
  element.localName = localName;
  element.tagName = localName.toUpperCase();
  if (localName === 'template') {
    element.content = createDocumentFragment();
  }
  return element;
});
ensureDocumentMethod('createTextNode', (data = '') => {
  const text = createNode(3, '#text');
  text.data = data;
  return text;
});
ensureDocumentMethod(treeWalkerMethod, (root: WorkerDomNode) => {
  const nodes: WorkerDomNode[] = [];
  const collect = (node: WorkerDomNode) => {
    node?.childNodes?.forEach(child => {
      nodes.push(child);
      collect(child);
    });
  };
  collect(root);

  const walker: {
    currentNode: WorkerDomNode | null;
    nextNode(): WorkerDomNode | null;
  } = {
    currentNode: root,
    nextNode() {
      const next = nodes.shift() ?? null;
      if (next) {
        walker.currentNode = next;
      }
      return next;
    },
  };

  return walker;
});
ensureDocumentMethod('importNode', (node: WorkerDomNode) =>
  typeof node?.cloneNode === 'function' ? node.cloneNode(true) : node
);

documentLike.documentElement ??= documentLike.createElement('html');
documentLike.head ??= documentLike.createElement('head');
documentLike.body ??= documentLike.createElement('body');
globalObject.document = documentLike;

export {};
